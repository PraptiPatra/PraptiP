import pandas as pd
import numpy as np
from models.schemas import CleanAssayData, ArmsConfig
from validators.schema_validator import ASSAY_SCHEMAS, IDENTITY_COLS


def _safe_serialize(val):
    """Convert numpy/nan types to JSON-safe Python types."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    return val


def format_assay(assay_key: str, df: pd.DataFrame, arms_config: ArmsConfig) -> CleanAssayData:
    schema = ASSAY_SCHEMAS[assay_key]
    post_tp = arms_config.post_treatment_timepoints.get(assay_key, "T72")
    base_tp = arms_config.baseline_timepoints.get(assay_key)

    # Filter to relevant timepoints
    relevant_tps = {post_tp}
    if base_tp:
        relevant_tps.add(base_tp)
    df_clean = df[df["Timepoint"].isin(relevant_tps)].copy() if "Timepoint" in df.columns else df.copy()

    metadata: dict = {
        "arms": {
            "control": arms_config.control_arm,
            "treated": arms_config.treated_arms,
        },
        "post_treatment_timepoint": post_tp,
        "baseline_timepoint": base_tp,
    }

    # NanoString: separate biological genes from QC columns
    if assay_key == "nanostring":
        hk_genes = [g for g in schema["housekeeping_genes"] if g in df_clean.columns]
        neg_cols = [c for c in schema["neg_controls"] if c in df_clean.columns]
        pos_cols = [c for c in schema["pos_controls"] if c in df_clean.columns]
        bio_cols = [
            c for c in df_clean.columns
            if c not in IDENTITY_COLS
            and c not in hk_genes
            and c not in neg_cols
            and c not in pos_cols
        ]
        metadata["biological_gene_count"] = len(bio_cols)
        metadata["housekeeping_genes"] = hk_genes
        metadata["neg_control_cols"] = neg_cols
        metadata["pos_control_cols"] = pos_cols
        # Keep only identity + biological genes in output (QC separate)
        keep_cols = list(IDENTITY_COLS) + bio_cols
        df_out = df_clean[[c for c in keep_cols if c in df_clean.columns]]
    else:
        df_out = df_clean

    # Replace NaN with None for JSON serialisation
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
    )
