import pandas as pd
import numpy as np
from models.schemas import CleanAssayData, ArmsConfig, FeatureSelectionSummary
from validators.schema_validator import ASSAY_SCHEMAS, IDENTITY_COLS
from formatters.feature_selector import select_features, P_VALUE_THRESHOLD, MIN_FEATURES

# Assays small enough that feature selection adds no value
SKIP_FEATURE_SELECTION_ASSAYS = {"histopathology"}  # 7 features; always pass all through


def _safe_serialize(val):
    """Convert numpy/nan types to JSON-safe Python types."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    return val


def _get_bio_cols(assay_key: str, df: pd.DataFrame, schema: dict) -> tuple[pd.DataFrame, list[str], dict]:
    """
    Strip QC/identity columns and return (df_out, bio_cols, extra_metadata).
    For NanoString this removes HK genes and NEG/POS controls.
    """
    extra_meta: dict = {}

    if assay_key == "nanostring":
        hk_genes = [g for g in schema["housekeeping_genes"] if g in df.columns]
        neg_cols = [c for c in schema["neg_controls"] if c in df.columns]
        pos_cols = [c for c in schema["pos_controls"] if c in df.columns]
        bio_cols = [
            c for c in df.columns
            if c not in IDENTITY_COLS
            and c not in hk_genes
            and c not in neg_cols
            and c not in pos_cols
        ]
        extra_meta = {
            "biological_gene_count": len(bio_cols),
            "housekeeping_genes": hk_genes,
            "neg_control_cols": neg_cols,
            "pos_control_cols": pos_cols,
        }
        keep = [c for c in list(IDENTITY_COLS) + bio_cols if c in df.columns]
        return df[keep], bio_cols, extra_meta

    bio_cols = [c for c in df.columns if c not in IDENTITY_COLS]
    return df, bio_cols, extra_meta


def format_assay(
    assay_key: str,
    df: pd.DataFrame,
    arms_config: ArmsConfig,
    use_feature_selection: bool = True,
    response_series: "pd.Series | None" = None,
    min_features: int = MIN_FEATURES,
    p_value_threshold: float = P_VALUE_THRESHOLD,
) -> CleanAssayData:
    """
    Format a single assay DataFrame into LLM-ready CleanAssayData.

    Parameters
    ----------
    use_feature_selection : if False, skip feature selection entirely
    response_series       : numeric/ordinal response labels indexed by Sample_ID;
                            if None, falls back to SD-based selection
    """
    schema = ASSAY_SCHEMAS[assay_key]
    post_tp = arms_config.post_treatment_timepoints.get(assay_key, "T72")
    base_tp = arms_config.baseline_timepoints.get(assay_key)

    # ── Filter to relevant timepoints ─────────────────────────────────────────
    relevant_tps = {post_tp}
    if base_tp:
        relevant_tps.add(base_tp)
    df_clean = df[df["Timepoint"].isin(relevant_tps)].copy() if "Timepoint" in df.columns else df.copy()

    metadata: dict = {
        "arms": {"control": arms_config.control_arm, "treated": arms_config.treated_arms},
        "post_treatment_timepoint": post_tp,
        "baseline_timepoint": base_tp,
    }

    # ── Strip QC columns (NanoString HK/NEG/POS) ──────────────────────────────
    df_out, bio_cols, extra_meta = _get_bio_cols(assay_key, df_clean, schema)
    metadata.update(extra_meta)

    # ── Feature selection ──────────────────────────────────────────────────────
    fs_summary: FeatureSelectionSummary | None = None

    if use_feature_selection and assay_key not in SKIP_FEATURE_SELECTION_ASSAYS and bio_cols:
        # Use only post-treatment rows for correlation (not baseline)
        df_post = df_out[df_out["Timepoint"] == post_tp].copy() if "Timepoint" in df_out.columns else df_out.copy()

        # Align response_series to df_post rows.
        # response_series may be a dict/Series keyed by (Sample_ID, Arms) tuples or Sample_ID strings.
        aligned_response = None
        if response_series is not None:
            if "Sample_ID" in df_post.columns and "Arms" in df_post.columns:
                composite = list(zip(df_post["Sample_ID"], df_post["Arms"]))
                mapped = pd.Series(
                    [response_series.get(k, np.nan) for k in composite],
                    index=df_post.index,
                )
                if mapped.notna().sum() >= 4:
                    aligned_response = mapped
                else:
                    aligned_response = df_post["Sample_ID"].map(response_series)
            elif "Sample_ID" in df_post.columns:
                aligned_response = df_post["Sample_ID"].map(response_series)

        fs_result = select_features(
            assay_key=assay_key,
            data=df_post,
            feature_cols=bio_cols,
            response_series=aligned_response,
            min_features=min_features,
            p_value_threshold=p_value_threshold,
        )

        fs_summary = FeatureSelectionSummary(
            selected_features=fs_result.selected_features,
            total_features=fs_result.total_features,
            selected_count=len(fs_result.selected_features),
            method_used=fs_result.method_used,
            skipped=fs_result.skipped,
            skip_reason=fs_result.skip_reason,
        )

        # Trim df_out to identity cols + selected features only
        keep_cols = [c for c in df_out.columns if c in IDENTITY_COLS or c in fs_result.selected_features]
        df_out = df_out[keep_cols]

        metadata["feature_selection_applied"] = True
        metadata["features_before_selection"] = fs_result.total_features
        metadata["features_after_selection"] = len(fs_result.selected_features)
        metadata["selection_method"] = fs_result.method_used
        if fs_result.skip_reason:
            metadata["selection_note"] = fs_result.skip_reason
    else:
        metadata["feature_selection_applied"] = False

    # ── Serialise rows ─────────────────────────────────────────────────────────
    rows = [
        {k: _safe_serialize(v) for k, v in row.items()}
        for row in df_out.to_dict(orient="records")
    ]

    return CleanAssayData(
        assay_name=assay_key,
        display_name=schema["display_name"],
        n_samples=df_out["Sample_ID"].nunique() if "Sample_ID" in df_out.columns else len(df_out),
        columns=list(df_out.columns),
        rows=rows,
        metadata=metadata,
        feature_selection=fs_summary,
    )
