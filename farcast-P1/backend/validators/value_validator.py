import pandas as pd
import numpy as np
from models.schemas import ValidationIssue, Severity
from validators.schema_validator import ASSAY_SCHEMAS, IDENTITY_COLS

NANOSTRING_FLOOR = 9.47
FLOOR_PCT_THRESHOLD = 0.10   # flag sample if >10% genes at floor
NEG_MEAN_THRESHOLD = 20.0    # flag if NEG control mean is high


def validate_values(assay_key: str, df: pd.DataFrame) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    schema = ASSAY_SCHEMAS[assay_key]

    # ── Numeric columns ──────────────────────────────────────────────────────
    if schema["numeric_cols"] is not None:
        num_cols = [c for c in schema["numeric_cols"] if c in df.columns]
    else:
        # All columns except identity
        num_cols = [c for c in df.columns if c not in IDENTITY_COLS]

    # Check for negatives in columns that should be non-negative
    non_negative_assays = {"cytokine", "flow_cytometry", "nanostring"}
    if assay_key in non_negative_assays:
        for col in num_cols:
            try:
                neg_mask = pd.to_numeric(df[col], errors="coerce") < 0
                neg_count = neg_mask.sum()
                if neg_count > 0:
                    affected = df.loc[neg_mask, "Sample_ID"].tolist() if "Sample_ID" in df.columns else []
                    issues.append(ValidationIssue(
                        severity=Severity.ERROR,
                        code="NEGATIVE_VALUE",
                        message=f"Column '{col}' has {neg_count} negative value(s)",
                        details="Negative values are not valid for this assay type",
                        affected_rows=affected,
                    ))
            except Exception:
                pass

    # ── H&E explicit range checks ─────────────────────────────────────────────
    if assay_key == "histopathology":
        for col, (lo, hi) in schema.get("value_ranges", {}).items():
            if col not in df.columns:
                continue
            vals = pd.to_numeric(df[col], errors="coerce")
            out = df[(vals < lo) | (vals > hi)]
            if not out.empty:
                affected = out["Sample_ID"].tolist() if "Sample_ID" in df.columns else []
                issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="VALUE_OUT_OF_RANGE",
                    message=f"'{col}': {len(out)} value(s) outside expected range [{lo}, {hi}]",
                    affected_rows=affected,
                ))

    # ── Flow Cytometry: frequencies should be 0–100 ──────────────────────────
    if assay_key == "flow_cytometry":
        for col in num_cols:
            vals = pd.to_numeric(df[col], errors="coerce")
            out = df[(vals < 0) | (vals > 100)]
            if not out.empty:
                issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="FREQUENCY_OUT_OF_RANGE",
                    message=f"'{col}': {len(out)} value(s) outside [0, 100]%",
                    affected_rows=out["Sample_ID"].tolist() if "Sample_ID" in df.columns else [],
                ))

    # ── NanoString QC checks ──────────────────────────────────────────────────
    if assay_key == "nanostring":
        hk_genes = [g for g in schema["housekeeping_genes"] if g in df.columns]
        neg_cols = [c for c in schema["neg_controls"] if c in df.columns]
        pos_cols = [c for c in schema["pos_controls"] if c in df.columns]
        biological_cols = [c for c in df.columns
                           if c not in IDENTITY_COLS
                           and c not in hk_genes
                           and c not in neg_cols
                           and c not in pos_cols]

        flagged_samples = []
        for _, row in df.iterrows():
            bio_vals = pd.to_numeric(row[biological_cols], errors="coerce")
            floor_pct = (bio_vals <= NANOSTRING_FLOOR).mean()
            if floor_pct > FLOOR_PCT_THRESHOLD:
                flagged_samples.append(str(row.get("Sample_ID", "?")))

        if flagged_samples:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="HIGH_FLOOR_PCT",
                message=f"{len(flagged_samples)} sample(s) have >10% genes at detection floor ({NANOSTRING_FLOOR})",
                details="This may indicate poor RNA quality or low library complexity",
                affected_rows=flagged_samples,
            ))

        # NEG control mean check
        if neg_cols:
            for _, row in df.iterrows():
                neg_vals = pd.to_numeric(row[neg_cols], errors="coerce")
                if neg_vals.mean() > NEG_MEAN_THRESHOLD:
                    issues.append(ValidationIssue(
                        severity=Severity.WARNING,
                        code="HIGH_BACKGROUND",
                        message=f"Sample '{row.get('Sample_ID', '?')}' has elevated NEG control mean ({neg_vals.mean():.1f})",
                        details="High background may indicate non-specific hybridisation",
                        affected_rows=[str(row.get("Sample_ID", "?"))],
                    ))
                    break  # report once then list samples below

        # POS control gradient check (POS_A should be highest)
        if len(pos_cols) >= 2:
            for _, row in df.iterrows():
                pos_vals = pd.to_numeric(row[pos_cols], errors="coerce").tolist()
                if not all(pos_vals[i] >= pos_vals[i + 1] for i in range(len(pos_vals) - 1)):
                    issues.append(ValidationIssue(
                        severity=Severity.WARNING,
                        code="POS_CONTROL_ORDER",
                        message=f"Sample '{row.get('Sample_ID', '?')}' POS controls not in expected descending order",
                        details="POS_A should have the highest counts, decreasing to POS_F",
                    ))
                    break

        # Housekeeping gene CV
        if hk_genes and "Sample_ID" in df.columns:
            hk_df = df[hk_genes].apply(pd.to_numeric, errors="coerce")
            cv_per_sample = hk_df.std(axis=1) / hk_df.mean(axis=1)
            high_cv = df.loc[cv_per_sample > 0.25, "Sample_ID"].tolist()
            if high_cv:
                issues.append(ValidationIssue(
                    severity=Severity.WARNING,
                    code="HIGH_HK_CV",
                    message=f"{len(high_cv)} sample(s) have housekeeping gene CV > 25%",
                    details="High CV across HK genes may indicate normalisation issues",
                    affected_rows=[str(s) for s in high_cv],
                ))

    # ── General: check for fully null rows (data columns only) ───────────────
    data_cols = [c for c in df.columns if c not in IDENTITY_COLS]
    if data_cols:
        null_row_mask = df[data_cols].isnull().all(axis=1)
        if null_row_mask.any():
            affected = df.loc[null_row_mask, "Sample_ID"].tolist() if "Sample_ID" in df.columns else []
            issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="EMPTY_DATA_ROW",
                message=f"{null_row_mask.sum()} row(s) have no data values at all",
                affected_rows=[str(a) for a in affected],
            ))

    return issues
