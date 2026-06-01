import json, io, re, os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
if not os.path.isdir(STATIC_DIR):
    STATIC_DIR = BASE_DIR
app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app)

# ─── Schema definitions ────────────────────────────────────────────────────────

ASSAY_SCHEMAS = {
    "histopathology": {
        "label": "Histopathology (H&E & IHC)",
        "required_columns": [
            "Sample_ID", "Timepoint", "Arms",
            "Median_Cas-3", "Median_Discohesion", "Median_Immune_component_%",
            "Median_Necrosis", "Median_Pyknosis", "Median_Tumor_%",
            "Median_Tumor_infiltrated_immune_cells_%"
        ],
        "valid_timepoints": ["TBL", "T72"],
        "numeric_columns": [
            "Median_Cas-3", "Median_Discohesion", "Median_Immune_component_%",
            "Median_Necrosis", "Median_Pyknosis", "Median_Tumor_%",
            "Median_Tumor_infiltrated_immune_cells_%"
        ],
        # (min, max) inclusive — biology-driven bounds
        "range_rules": {
            "Median_Necrosis":       (0, 5,   "Scale 1–5 (can be 0 for none)"),
            "Median_Discohesion":    (0, 5,   "Scale 1–5 (can be 0 for none)"),
            "Median_Pyknosis":       (0, 5,   "Scale 1–5 (can be 0 for none)"),
            "Median_Tumor_%":        (0, 100, "Percentage 0–100"),
            "Median_Immune_component_%":              (0, 100, "Percentage 0–100"),
            "Median_Tumor_infiltrated_immune_cells_%":(0, 100, "Percentage 0–100"),
            "Median_Cas-3":          (0, 100, "Percentage 0–100"),
        },
        # columns that must be non-negative
        "non_negative_columns": [
            "Median_Cas-3", "Median_Discohesion", "Median_Immune_component_%",
            "Median_Necrosis", "Median_Pyknosis", "Median_Tumor_%",
            "Median_Tumor_infiltrated_immune_cells_%"
        ],
        "id_column": "Sample_ID",
        "id_pattern": r"^FBR\w+",
        "id_pattern_desc": "FBR followed by alphanumerics (e.g. FBR1K220006)",
    },
    "cytokine": {
        "label": "Cytokine",
        "required_columns": [
            "Sample_ID", "Timepoint", "Arms",
            "IL-10", "IFN-g", "TNF-a", "Perforin", "Granzyme B"
        ],
        "valid_timepoints": ["T0", "Tavg"],
        "numeric_columns": ["IL-10", "IFN-g", "TNF-a", "Perforin", "Granzyme B"],
        "range_rules": {
            "IL-10":      (0, None, "Concentration — must be ≥ 0"),
            "IFN-g":      (0, None, "Concentration — must be ≥ 0"),
            "TNF-a":      (0, None, "Concentration — must be ≥ 0"),
            "Perforin":   (0, None, "Concentration — must be ≥ 0"),
            "Granzyme B": (0, None, "Concentration — must be ≥ 0"),
        },
        "non_negative_columns": ["IL-10", "IFN-g", "TNF-a", "Perforin", "Granzyme B"],
        "id_column": "Sample_ID",
        "id_pattern": r"^FBR\w+",
        "id_pattern_desc": "FBR followed by alphanumerics",
    },
    "flow_cytometry": {
        "label": "Flow Cytometry",
        "required_columns": [
            "Sample_ID", "Timepoint", "Arms",
            "CD45+ | Freq. of Live (%)",
            "Macrophage| Freq. of CD45+ (%)",
            "M2 | Freq. of CD45+ (%)",
            "Tcell | Freq. of CD45+ (%)",
            "CD4+ | Freq. of CD45+ (%)",
            "Treg| Freq. of CD45+ (%)",
            "CTL| Freq. of CD45+ (%)",
        ],
        "valid_timepoints": ["T72"],
        "numeric_columns": [
            "CD45+ | Freq. of Live (%)",
            "Macrophage| Freq. of CD45+ (%)",
            "M2 | Freq. of CD45+ (%)",
            "Tcell | Freq. of CD45+ (%)",
            "CD4+ | Freq. of CD45+ (%)",
            "Treg| Freq. of CD45+ (%)",
            "CTL| Freq. of CD45+ (%)",
        ],
        "range_rules": {
            "CD45+ | Freq. of Live (%)":          (0, 100, "Frequency % — must be 0–100"),
            "Macrophage| Freq. of CD45+ (%)":     (0, 100, "Frequency % — must be 0–100"),
            "M2 | Freq. of CD45+ (%)":            (0, 100, "Frequency % — must be 0–100"),
            "Tcell | Freq. of CD45+ (%)":         (0, 100, "Frequency % — must be 0–100"),
            "CD4+ | Freq. of CD45+ (%)":          (0, 100, "Frequency % — must be 0–100"),
            "Treg| Freq. of CD45+ (%)":           (0, 100, "Frequency % — must be 0–100"),
            "CTL| Freq. of CD45+ (%)":            (0, 100, "Frequency % — must be 0–100"),
        },
        "non_negative_columns": [
            "CD45+ | Freq. of Live (%)", "Macrophage| Freq. of CD45+ (%)",
            "M2 | Freq. of CD45+ (%)", "Tcell | Freq. of CD45+ (%)",
            "CD4+ | Freq. of CD45+ (%)", "Treg| Freq. of CD45+ (%)", "CTL| Freq. of CD45+ (%)",
        ],
        "id_column": "Sample_ID",
        "id_pattern": r"^FBR\w+",
        "id_pattern_desc": "FBR followed by alphanumerics",
    },
    "nanostring": {
        "label": "NanoString",
        "required_columns": ["Sample_ID", "Timepoint", "Arms"],
        "valid_timepoints": ["T72"],
        "numeric_columns": [],   # gene columns all checked dynamically
        "range_rules": {},
        "non_negative_columns": [],
        "min_gene_columns": 50,
        "id_column": "Sample_ID",
        "id_pattern": r"^FBR\w+",
        "id_pattern_desc": "FBR followed by alphanumerics",
    },
}

REQUIRED_ARMS = ["Rx-A", "Rx-B", "Rx-C"]


# ─── Parsing ───────────────────────────────────────────────────────────────────

def parse_excel(file_bytes):
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    sheets = {}
    for name in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=name, header=None)
        header_row = None
        for i, row in df.iterrows():
            if any(str(v).strip() == "Sample_ID" for v in row.values if pd.notna(v)):
                header_row = i
                break
        if header_row is not None:
            df.columns = df.iloc[header_row].astype(str).str.strip()
            df = df.iloc[header_row + 1:].reset_index(drop=True)
            df = df.dropna(how="all")
        sheets[name] = df
    return sheets


def detect_assay_type(sheet_name, df):
    name_lower = sheet_name.lower()
    cols = [str(c).strip() for c in df.columns]
    if "h&e" in name_lower or "ihc" in name_lower or "histopath" in name_lower:
        return "histopathology"
    if "cytokine" in name_lower:
        return "cytokine"
    if "flow" in name_lower:
        return "flow_cytometry"
    if "nanostring" in name_lower:
        return "nanostring"
    if "Median_Tumor_%" in cols or "Median_Cas-3" in cols:
        return "histopathology"
    if "IL-10" in cols and "IFN-g" in cols:
        return "cytokine"
    if any("Freq. of CD45" in c for c in cols):
        return "flow_cytometry"
    if len(cols) > 100:
        return "nanostring"
    return None


# ─── Core validator ────────────────────────────────────────────────────────────

def make_issue(severity, category, message, rows=None, col=None, tip=None):
    d = {"severity": severity, "category": category, "message": message}
    if rows:
        d["rows"] = rows          # list of 1-based row numbers
    if col:
        d["col"] = col
    if tip:
        d["tip"] = tip
    return d


def validate_assay(df, assay_type):
    schema   = ASSAY_SCHEMAS[assay_type]
    issues   = []
    stats    = {}
    cols     = [str(c).strip() for c in df.columns]

    # ── 1. Duplicate column names ────────────────────────────────────────────
    seen, dupes = set(), set()
    for c in cols:
        if c in seen:
            dupes.add(c)
        seen.add(c)
    if dupes:
        issues.append(make_issue("error", "Duplicate Columns",
            f"Column name(s) appear more than once: {', '.join(sorted(dupes))}",
            tip="Each column must have a unique header. Rename or remove the duplicates."))

    # ── 2. Missing required columns ──────────────────────────────────────────
    missing_cols = [c for c in schema["required_columns"] if c not in cols]
    if missing_cols:
        issues.append(make_issue("error", "Missing Required Columns",
            f"{len(missing_cols)} required column(s) absent: {', '.join(missing_cols)}",
            tip="These columns are mandatory for this assay type. Add them and re-upload."))

    # ── 3. Completely empty columns ──────────────────────────────────────────
    for c in cols:
        if c in schema["required_columns"] and c in df.columns:
            if df[c].isna().all():
                issues.append(make_issue("error", "Empty Required Column",
                    f"Column '{c}' is present but contains no data at all.",
                    col=c, tip="Fill in the column or remove it if it is not applicable."))

    # ── 4. Sample ID checks ──────────────────────────────────────────────────
    if "Sample_ID" in df.columns:
        sid = df["Sample_ID"]
        # 4a. Blank sample IDs
        blank_mask = sid.isna() | (sid.astype(str).str.strip() == "") | (sid.astype(str).str.strip().str.lower() == "nan")
        blank_rows = (blank_mask[blank_mask].index + 2).tolist()   # +2: 1-based + header
        if blank_rows:
            issues.append(make_issue("error", "Blank Sample ID",
                f"{len(blank_rows)} row(s) have no Sample_ID.",
                rows=blank_rows[:20], col="Sample_ID",
                tip="Every row must have a valid Sample_ID. Fill in or remove empty rows."))

        # 4b. Whitespace padding
        padded = sid.dropna().astype(str)
        padded_mask = padded != padded.str.strip()
        padded_rows = (padded_mask[padded_mask].index + 2).tolist()
        if padded_rows:
            issues.append(make_issue("warning", "Whitespace in Sample ID",
                f"{len(padded_rows)} Sample_ID value(s) have leading or trailing spaces.",
                rows=padded_rows[:20], col="Sample_ID",
                tip="Trim whitespace — it will cause mismatches in cross-assay alignment."))

        # 4c. ID format
        pattern = schema.get("id_pattern")
        if pattern:
            valid_ids = sid.dropna().astype(str).str.strip()
            bad_mask  = ~valid_ids.str.match(pattern)
            bad_vals  = valid_ids[bad_mask]
            bad_rows  = (bad_vals.index + 2).tolist()
            if bad_rows:
                issues.append(make_issue("warning", "Sample ID Format Mismatch",
                    f"{len(bad_rows)} Sample_ID(s) don't match expected pattern "
                    f"({schema['id_pattern_desc']}): {', '.join(bad_vals.unique()[:5])}",
                    rows=bad_rows[:20], col="Sample_ID",
                    tip=f"Expected format: {schema['id_pattern_desc']}"))

        # 4d. Duplicate rows (same Sample_ID + Timepoint + Arm)
        key_cols = [c for c in ["Sample_ID", "Timepoint", "Arms"] if c in df.columns]
        if len(key_cols) == 3:
            dupe_mask = df.duplicated(subset=key_cols, keep=False)
            dupe_rows = (dupe_mask[dupe_mask].index + 2).tolist()
            if dupe_rows:
                issues.append(make_issue("error", "Duplicate Records",
                    f"{len(dupe_rows)} rows share the same Sample_ID + Timepoint + Arm combination.",
                    rows=dupe_rows[:20],
                    tip="Each (Sample_ID, Timepoint, Arm) must be unique. Remove duplicates."))

        stats["unique_samples"] = int(sid.dropna().astype(str).str.strip().nunique())
        stats["total_rows"]     = len(df)

    # ── 5. Timepoint checks ──────────────────────────────────────────────────
    if "Timepoint" in df.columns and schema.get("valid_timepoints"):
        tp = df["Timepoint"]
        valid_set = set(schema["valid_timepoints"])

        # 5a. Blank timepoints
        blank_tp = tp.isna() | (tp.astype(str).str.strip() == "")
        blank_tp_rows = (blank_tp[blank_tp].index + 2).tolist()
        if blank_tp_rows:
            issues.append(make_issue("error", "Blank Timepoint",
                f"{len(blank_tp_rows)} row(s) have no Timepoint value.",
                rows=blank_tp_rows[:20], col="Timepoint",
                tip=f"Valid timepoints for this assay: {', '.join(schema['valid_timepoints'])}"))

        # 5b. Invalid timepoint values
        actual_tp = tp.dropna().astype(str).str.strip()
        invalid_tp_vals = actual_tp[~actual_tp.isin(valid_set)]
        if not invalid_tp_vals.empty:
            inv_rows = (invalid_tp_vals.index + 2).tolist()
            inv_uniq = invalid_tp_vals.unique().tolist()
            issues.append(make_issue("error", "Invalid Timepoint Value",
                f"Unrecognised timepoint(s): {', '.join(inv_uniq)}. Expected: {', '.join(schema['valid_timepoints'])}",
                rows=inv_rows[:20], col="Timepoint",
                tip="Check for typos or casing issues (values are case-sensitive)."))

        # 5c. Text that looks like a date accidentally entered
        date_like = actual_tp.str.match(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}")
        date_rows = (date_like[date_like].index + 2).tolist()
        if date_rows:
            issues.append(make_issue("warning", "Date-Like Value in Timepoint",
                f"{len(date_rows)} row(s) have a date-like value in Timepoint (e.g. '12/03/24').",
                rows=date_rows[:10], col="Timepoint",
                tip=f"Timepoint should be a label like {', '.join(schema['valid_timepoints'])}, not a calendar date."))

        stats["timepoints"] = sorted(actual_tp.unique().tolist())

    # ── 6. Arms checks ───────────────────────────────────────────────────────
    if "Arms" in df.columns:
        arms_col = df["Arms"]

        # 6a. Blank arms
        blank_arms = arms_col.isna() | (arms_col.astype(str).str.strip() == "")
        blank_arm_rows = (blank_arms[blank_arms].index + 2).tolist()
        if blank_arm_rows:
            issues.append(make_issue("error", "Blank Arm Assignment",
                f"{len(blank_arm_rows)} row(s) have no Arms value.",
                rows=blank_arm_rows[:20], col="Arms",
                tip="Every row must be assigned to a treatment arm."))

        actual_arms = arms_col.dropna().astype(str).str.strip().unique().tolist()
        missing_arms = [a for a in REQUIRED_ARMS if a not in actual_arms]
        if missing_arms:
            issues.append(make_issue("warning", "Expected Arms Not Found",
                f"Arms {', '.join(missing_arms)} not present in this sheet (found: {', '.join(actual_arms)}).",
                col="Arms",
                tip="Expected all of Rx-A, Rx-B, Rx-C. If this is intentional, ignore."))

        stats["arms"] = actual_arms

    # ── 7. Numeric column checks ─────────────────────────────────────────────
    for col in schema.get("numeric_columns", []):
        if col not in df.columns:
            continue
        raw    = df[col]
        parsed = pd.to_numeric(raw, errors="coerce")

        # 7a. Non-numeric values (text where number expected)
        non_num_mask = parsed.isna() & raw.notna() & (raw.astype(str).str.strip() != "")
        non_num_rows = (non_num_mask[non_num_mask].index + 2).tolist()
        bad_vals     = raw[non_num_mask].astype(str).unique().tolist()
        if non_num_rows:
            issues.append(make_issue("error", "Non-Numeric Value in Numeric Column",
                f"Column '{col}' expects numbers but found text/mixed values: "
                f"{', '.join(repr(v) for v in bad_vals[:5])}",
                rows=non_num_rows[:20], col=col,
                tip="Replace text descriptions with numeric values, or use NaN/blank for missing data."))

        # 7b. Truly missing (NaN / blank)
        missing_mask = raw.isna() | (raw.astype(str).str.strip() == "")
        missing_rows = (missing_mask[missing_mask].index + 2).tolist()
        if missing_rows:
            issues.append(make_issue("warning", "Missing Numeric Value",
                f"Column '{col}' has {len(missing_rows)} empty cell(s).",
                rows=missing_rows[:20], col=col,
                tip="Fill in missing measurements or document why they are absent."))

        # 7c. Range / bounds
        rule = schema.get("range_rules", {}).get(col)
        if rule:
            lo, hi, rule_desc = rule
            if lo is not None:
                below = parsed < lo
                below_rows = (below[below].index + 2).tolist()
                if below_rows:
                    issues.append(make_issue("error", "Value Below Minimum",
                        f"Column '{col}': {len(below_rows)} value(s) below minimum {lo}. ({rule_desc})",
                        rows=below_rows[:20], col=col,
                        tip=f"Check for data entry errors. {rule_desc}."))
            if hi is not None:
                above = parsed > hi
                above_rows = (above[above].index + 2).tolist()
                if above_rows:
                    issues.append(make_issue("error", "Value Exceeds Maximum",
                        f"Column '{col}': {len(above_rows)} value(s) above maximum {hi}. ({rule_desc})",
                        rows=above_rows[:20], col=col,
                        tip=f"Check for data entry errors. {rule_desc}."))

        # 7d. Statistical outliers — values >3 IQR from Q1/Q3 (flag only as info)
        if parsed.dropna().shape[0] >= 4:
            q1, q3 = parsed.quantile(0.25), parsed.quantile(0.75)
            iqr = q3 - q1
            if iqr > 0:
                outlier_mask = (parsed < q1 - 3*iqr) | (parsed > q3 + 3*iqr)
                out_rows = (outlier_mask[outlier_mask].index + 2).tolist()
                out_vals = parsed[outlier_mask].round(2).tolist()
                if out_rows:
                    issues.append(make_issue("info", "Statistical Outlier",
                        f"Column '{col}': {len(out_rows)} value(s) are extreme outliers "
                        f"(>3×IQR from quartiles): {out_vals[:5]}",
                        rows=out_rows[:10], col=col,
                        tip="May be genuine biology or a data entry error — review manually."))

        if parsed.dropna().shape[0] > 0:
            stats[f"{col}·range"] = f"{parsed.min():.2f} – {parsed.max():.2f}"
            stats[f"{col}·n_valid"] = int(parsed.notna().sum())

    # ── 8. NanoString gene columns ───────────────────────────────────────────
    if assay_type == "nanostring":
        meta_cols   = {"Sample_ID", "Timepoint", "Arms"}
        gene_cols   = [c for c in cols if c not in meta_cols]
        min_genes   = schema.get("min_gene_columns", 50)
        stats["gene_columns"] = len(gene_cols)

        if len(gene_cols) < min_genes:
            issues.append(make_issue("warning", "Low Gene Column Count",
                f"Only {len(gene_cols)} gene columns detected; expected ≥ {min_genes}.",
                tip="Ensure the full NanoString panel is included."))

        # Check that all gene columns are numeric
        bad_gene_cols = []
        for gc in gene_cols[:300]:      # cap to avoid slow loop on huge panels
            if gc in df.columns:
                parsed_g = pd.to_numeric(df[gc], errors="coerce")
                non_num  = parsed_g.isna() & df[gc].notna() & (df[gc].astype(str).str.strip() != "")
                if non_num.any():
                    bad_gene_cols.append(gc)
        if bad_gene_cols:
            issues.append(make_issue("error", "Non-Numeric Gene Expression Values",
                f"{len(bad_gene_cols)} gene column(s) contain non-numeric data: "
                f"{', '.join(bad_gene_cols[:8])}{'…' if len(bad_gene_cols) > 8 else ''}",
                tip="Gene expression values must be numeric (log2 counts). "
                    "Replace text entries with numbers or NaN."))

        # Check for negative gene expression (log2 can be negative, so warn not error)
        neg_gene_cols = []
        for gc in gene_cols[:300]:
            if gc in df.columns:
                parsed_g = pd.to_numeric(df[gc], errors="coerce")
                if (parsed_g < 0).any():
                    neg_gene_cols.append(gc)
        if neg_gene_cols:
            issues.append(make_issue("info", "Negative Gene Expression Values",
                f"{len(neg_gene_cols)} gene column(s) contain negative values. "
                "This is expected for log2-transformed data but unusual for raw counts.",
                tip="Confirm whether values are raw counts (should be ≥0) or log2-transformed (negatives OK)."))

    return {"issues": issues, "stats": stats}


# ─── Cross-assay alignment ─────────────────────────────────────────────────────

def cross_assay_alignment(assay_results, assay_labels):
    sample_sets = {}
    for atype, result in assay_results.items():
        if result.get("sample_ids"):
            sample_sets[atype] = set(result["sample_ids"])

    issues = []
    if len(sample_sets) < 2:
        return issues

    checked = set()
    for a in sample_sets:
        for b in sample_sets:
            if a >= b or (a, b) in checked:
                continue
            checked.add((a, b))
            only_a = sorted(sample_sets[a] - sample_sets[b])
            only_b = sorted(sample_sets[b] - sample_sets[a])
            la, lb = assay_labels.get(a, a), assay_labels.get(b, b)
            if only_a:
                issues.append(make_issue("warning", "Cross-Assay Sample Mismatch",
                    f"{len(only_a)} sample(s) present in {la} but missing from {lb}: "
                    f"{', '.join(only_a[:8])}{'…' if len(only_a) > 8 else ''}",
                    tip="Sample IDs must match exactly across all assays. "
                        "Check for typos or missing data."))
            if only_b:
                issues.append(make_issue("warning", "Cross-Assay Sample Mismatch",
                    f"{len(only_b)} sample(s) present in {lb} but missing from {la}: "
                    f"{', '.join(only_b[:8])}{'…' if len(only_b) > 8 else ''}",
                    tip="Sample IDs must match exactly across all assays."))

    # Timepoint coverage — warn if any assay is missing a timepoint others have
    tp_sets = {}
    for atype, result in assay_results.items():
        tps = result.get("stats", {}).get("timepoints")
        if tps:
            tp_sets[atype] = set(tps)

    return issues


# ─── Arms suggestion (pure heuristic, no AI) ──────────────────────────────────

def suggest_arms_heuristic(arms):
    suggestions = {}
    for arm in arms:
        a = arm.lower().replace("-", "").replace("_", "").replace(" ", "")
        if any(k in a for k in ["arm1", "arma", "ctrl", "control", "vehicle", "veh",
                                 "dmso", "pbs", "untreated", "baseline"]):
            suggestions[arm] = "control"
        elif any(k in a for k in ["rxa", "rx1", "arm1"]):
            suggestions[arm] = "control"
        else:
            suggestions[arm] = "treated"
    return suggestions


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/validate", methods=["POST"])
def validate():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file     = request.files["file"]
    arms_map = json.loads(request.form.get("arms_map", "{}"))

    try:
        sheets = parse_excel(file.read())
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {e}"}), 400

    validation_results = {}
    assay_labels       = {}
    detected_assays    = {}

    for sheet_name, df in sheets.items():
        if df.empty:
            continue
        cols = [str(c).strip() for c in df.columns]
        if "Sample_ID" not in cols:
            continue
        atype = detect_assay_type(sheet_name, df)
        if not atype:
            continue

        detected_assays[sheet_name] = atype
        result = validate_assay(df, atype)
        result["sample_ids"] = (
            df["Sample_ID"].dropna().astype(str).str.strip().unique().tolist()
            if "Sample_ID" in df.columns else []
        )
        validation_results[atype] = result
        assay_labels[atype]       = ASSAY_SCHEMAS[atype]["label"]

    cross_issues = cross_assay_alignment(validation_results, assay_labels)
    validation_results["cross_assay"] = {"issues": cross_issues}

    # Summary counts (by severity keys used in issues: 'error'|'warning'|'info')
    counts = {"error": 0, "warning": 0, "info": 0}
    for atype, result in validation_results.items():
        for issue in result.get("issues", []):
            sev = issue.get("severity", "info")
            counts[sev] = counts.get(sev, 0) + 1

    # Provide both singular (by-severity) and plural top-level counts for compatibility
    summary = {
        "errors": counts["error"],
        "warnings": counts["warning"],
        "info": counts["info"],
        "by_severity": counts,
    }

    return jsonify({
        "detected_assays":    detected_assays,
        "validation_results": validation_results,
        "assay_labels":       assay_labels,
        "arms_info":          arms_map,
        "summary":            summary,
        "sheets_found":       list(sheets.keys()),
    })


@app.route("/api/suggest-arms", methods=["POST"])
def suggest_arms():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    try:
        sheets = parse_excel(request.files["file"].read())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    arms_found = set()
    for df in sheets.values():
        if "Arms" in [str(c).strip() for c in df.columns]:
            arms_found.update(df["Arms"].dropna().astype(str).str.strip().unique())

    arms = sorted(arms_found)
    return jsonify({"arms": arms, "suggestions": suggest_arms_heuristic(arms)})


if __name__ == "__main__":
    print("\n🧬 Farcast Assay Validator")
    print("=" * 40)
    print("Open: http://localhost:5051")
    print("=" * 40)
    app.run(debug=True, port=5051)
