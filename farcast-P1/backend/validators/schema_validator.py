import pandas as pd
from models.schemas import AssayValidationResult, ValidationIssue, Severity

# ── Canonical schema definitions ──────────────────────────────────────────────

ASSAY_SCHEMAS = {
    "histopathology": {
        "display_name": "Histopathology (H&E + IHC)",
        "sheet": "H&E and IHC_n=16",
        "required_cols": [
            "Sample_ID", "Timepoint", "Arms",
            "Median_Cas-3", "Median_Discohesion",
            "Median_Immune_component_%", "Median_Necrosis",
            "Median_Pyknosis", "Median_Tumor_%",
            "Median_Tumor_infiltrated_immune_cells_%",
        ],
        "expected_timepoints": {"TBL", "T72"},
        "expected_arms": {"Arm-1", "Rx-A", "Rx-B", "Rx-C"},
        "numeric_cols": [
            "Median_Cas-3", "Median_Discohesion", "Median_Immune_component_%",
            "Median_Necrosis", "Median_Pyknosis", "Median_Tumor_%",
            "Median_Tumor_infiltrated_immune_cells_%",
        ],
        "value_ranges": {
            "Median_Cas-3": (0, 10),
            "Median_Discohesion": (0, 5),
            "Median_Necrosis": (0, 5),
            "Median_Pyknosis": (0, 5),
            "Median_Tumor_%": (0, 100),
            "Median_Immune_component_%": (0, 100),
            "Median_Tumor_infiltrated_immune_cells_%": (0, 100),
        },
    },
    "cytokine": {
        "display_name": "Cytokine Panel",
        "sheet": "Cytokine_n=16",
        "required_cols": [
            "Sample_ID", "Timepoint", "Arms",
            "IL-10", "IFN-g", "TNF-a", "Perforin", "Granzyme B",
        ],
        "expected_timepoints": {"T0", "Tavg"},
        "expected_arms": {"Rx-A", "Rx-B", "Rx-C"},
        "numeric_cols": ["IL-10", "IFN-g", "TNF-a", "Perforin", "Granzyme B"],
        "value_ranges": {},  # concentrations — just check non-negative
    },
    "flow_cytometry": {
        "display_name": "Flow Cytometry",
        "sheet": "Flowcytometry_n=16",
        "required_cols": [
            "Sample_ID", "Timepoint", "Arms",
            "CD45+ | Freq. of Live (%)",
            "Macrophage| Freq. of CD45+ (%)",
            "M2 | Freq. of CD45+ (%)",
            "Tcell | Freq. of CD45+ (%)",
            "CD4+ | Freq. of CD45+ (%)",
            "Treg| Freq. of CD45+ (%)",
            "CTL| Freq. of CD45+ (%)",
            "Non-T cell  | Freq. of CD45+ (%)",
            "CD8+Ki67+ | Freq. of Parent (%)",
            "CD8+GranzymeB+ | Freq. of Parent (%)",
            "CD4+FoxP3+CTLA4+ | Freq. of Parent (%)",
            "CD4+FoxP3+Ki67+ | Freq. of Parent (%)",
            "Treg freq parent",
            "CTL freq parent",
        ],
        "expected_timepoints": {"T72"},
        "expected_arms": {"Rx-A", "Rx-B", "Rx-C"},
        "numeric_cols": None,  # all except first 3
        "value_ranges": {},  # 0-100 checked dynamically
    },
    "nanostring": {
        "display_name": "NanoString Gene Expression",
        "sheet": "NanoString_n=16",
        "required_cols": ["Sample_ID", "Timepoint", "Arms"],
        "expected_timepoints": {"T72"},
        "expected_arms": {"Rx-A", "Rx-B", "Rx-C"},
        "numeric_cols": None,
        "value_ranges": {},
        "min_gene_cols": 750,
        "housekeeping_genes": [
            "ABCF1", "DNAJC14", "ERCC3", "G6PD", "GUSB", "MRPL19",
            "NRDE2", "OAZ1", "POLR2A", "PSMC4", "PUM1", "SDHA",
            "SF3A1", "STK11IP", "TBC1D10B", "TBP", "TFRC", "TLK2",
            "TMUB2", "UBB",
        ],
        "neg_controls": ["NEG_A", "NEG_B", "NEG_C", "NEG_D", "NEG_E", "NEG_F", "NEG_G", "NEG_H"],
        "pos_controls": ["POS_A", "POS_B", "POS_C", "POS_D", "POS_E", "POS_F"],
        "floor_value": 9.47,
    },
}

IDENTITY_COLS = {"Sample_ID", "Timepoint", "Arms"}


def validate_schema(assay_key: str, df: pd.DataFrame) -> AssayValidationResult:
    schema = ASSAY_SCHEMAS[assay_key]
    issues: list[ValidationIssue] = []
    cols = list(df.columns)

    # 1. Required columns present
    missing_cols = [c for c in schema["required_cols"] if c not in cols]
    if missing_cols:
        issues.append(ValidationIssue(
            severity=Severity.ERROR,
            code="MISSING_COLUMNS",
            message=f"{len(missing_cols)} required column(s) missing",
            details=f"Missing: {', '.join(missing_cols)}",
        ))

    # 2. NanoString: check minimum gene count
    if assay_key == "nanostring":
        non_identity = [c for c in cols if c not in IDENTITY_COLS]
        gene_cols = [c for c in non_identity
                     if c not in schema["housekeeping_genes"]
                     and c not in schema["neg_controls"]
                     and c not in schema["pos_controls"]]
        if len(gene_cols) < schema["min_gene_cols"]:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="LOW_GENE_COUNT",
                message=f"Only {len(gene_cols)} biological gene columns found (expected ≥{schema['min_gene_cols']})",
                details="Panel may be an older version or columns may have been dropped",
            ))

        missing_hk = [g for g in schema["housekeeping_genes"] if g not in cols]
        if missing_hk:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="MISSING_HOUSEKEEPING",
                message=f"{len(missing_hk)} housekeeping gene(s) missing",
                details=f"Missing: {', '.join(missing_hk)}",
            ))

        missing_neg = [c for c in schema["neg_controls"] if c not in cols]
        missing_pos = [c for c in schema["pos_controls"] if c not in cols]
        if missing_neg or missing_pos:
            issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="MISSING_QC_CONTROLS",
                message="NanoString QC control columns missing",
                details=f"Missing NEG: {missing_neg} | Missing POS: {missing_pos}",
            ))

    # 3. Unexpected timepoints
    if "Timepoint" in df.columns:
        found_tp = set(df["Timepoint"].dropna().unique())
        unexpected = found_tp - schema["expected_timepoints"]
        missing_tp = schema["expected_timepoints"] - found_tp
        if unexpected:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="UNEXPECTED_TIMEPOINTS",
                message=f"Unexpected timepoint(s): {', '.join(str(t) for t in unexpected)}",
                details=f"Expected: {schema['expected_timepoints']}",
            ))
        if missing_tp:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="MISSING_TIMEPOINTS",
                message=f"Expected timepoint(s) not found: {', '.join(str(t) for t in missing_tp)}",
                details="Check if baseline/post-treatment rows are present",
            ))

    # 4. Unexpected arms
    if "Arms" in df.columns:
        found_arms = set(df["Arms"].dropna().unique())
        unexpected_arms = found_arms - schema["expected_arms"]
        if unexpected_arms:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="UNEXPECTED_ARMS",
                message=f"Unexpected arm label(s): {', '.join(str(a) for a in unexpected_arms)}",
                details=f"Expected arms: {schema['expected_arms']}",
            ))

    # 5. Duplicate rows (Sample_ID + Timepoint + Arms)
    if all(c in df.columns for c in ["Sample_ID", "Timepoint", "Arms"]):
        dups = df[df.duplicated(subset=["Sample_ID", "Timepoint", "Arms"], keep=False)]
        if not dups.empty:
            dup_ids = dups["Sample_ID"].unique().tolist()
            issues.append(ValidationIssue(
                severity=Severity.ERROR,
                code="DUPLICATE_ROWS",
                message=f"{len(dups)} duplicate rows (same Sample_ID + Timepoint + Arms)",
                affected_rows=dup_ids,
            ))

    # 6. Null values in identity columns
    for id_col in ["Sample_ID", "Timepoint", "Arms"]:
        if id_col in df.columns:
            null_count = df[id_col].isna().sum()
            if null_count > 0:
                issues.append(ValidationIssue(
                    severity=Severity.ERROR,
                    code="NULL_IDENTITY_COLUMN",
                    message=f"{null_count} null value(s) in '{id_col}'",
                    details="Every row must have a Sample_ID, Timepoint, and Arms value",
                ))

    # 7. Sample ID format check
    if "Sample_ID" in df.columns:
        bad_ids = df[~df["Sample_ID"].astype(str).str.match(r"FBR1[BK]\d{6}", na=False)]["Sample_ID"].unique()
        if len(bad_ids) > 0:
            issues.append(ValidationIssue(
                severity=Severity.WARNING,
                code="NONSTANDARD_SAMPLE_ID",
                message=f"{len(bad_ids)} Sample ID(s) don't match expected format FBR1[B/K]XXXXXX",
                details=f"Non-standard IDs: {list(bad_ids)[:5]}{'...' if len(bad_ids) > 5 else ''}",
                affected_rows=list(bad_ids),
            ))

    sample_ids = df["Sample_ID"].dropna().unique().tolist() if "Sample_ID" in df.columns else []
    timepoints = df["Timepoint"].dropna().unique().tolist() if "Timepoint" in df.columns else []
    arms = df["Arms"].dropna().unique().tolist() if "Arms" in df.columns else []

    passed = not any(i.severity == Severity.ERROR for i in issues)

    return AssayValidationResult(
        assay_name=assay_key,
        display_name=schema["display_name"],
        passed=passed,
        row_count=len(df),
        col_count=len(df.columns),
        issues=issues,
        sample_ids=sorted(sample_ids),
        timepoints=sorted(timepoints),
        arms=sorted(arms),
    )
