import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json

from models.schemas import (
    ValidationResponse, ArmsConfig, AssayValidationResult,
    AlignmentResult, CleanAssayData, Severity
)
from validators.schema_validator import ASSAY_SCHEMAS, validate_schema
from validators.value_validator import validate_values
from validators.sample_aligner import align_samples
from formatters.assay_formatter import format_assay

app = FastAPI(
    title="Farcast TiME Assay Validation API",
    description="Validates and formats multi-modal assay data for LLM-powered analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to Vercel URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHEET_TO_ASSAY = {schema["sheet"]: key for key, schema in ASSAY_SCHEMAS.items()}


def _load_assay_dfs(file_bytes: bytes) -> dict[str, pd.DataFrame]:
    """Load all recognised assay sheets from the Excel file."""
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    loaded: dict[str, pd.DataFrame] = {}
    for sheet in xl.sheet_names:
        if sheet in SHEET_TO_ASSAY:
            assay_key = SHEET_TO_ASSAY[sheet]
            loaded[assay_key] = xl.parse(sheet)
    return loaded


@app.get("/health")
def health():
    return {"status": "ok", "service": "farcast-validation-api"}


@app.post("/api/validate", response_model=ValidationResponse)
async def validate_file(
    file: UploadFile = File(...),
    arms_config_json: str = Form(default=None),
    use_feature_selection: bool = Form(default=True),
):
    # ── Parse arms config ──────────────────────────────────────────────────
    if arms_config_json:
        try:
            arms_config = ArmsConfig(**json.loads(arms_config_json))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid arms_config: {e}")
    else:
        arms_config = ArmsConfig()

    # ── Read file ──────────────────────────────────────────────────────────
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx/.xls files are accepted")

    file_bytes = await file.read()
    try:
        assay_dfs = _load_assay_dfs(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse Excel file: {e}")

    if not assay_dfs:
        raise HTTPException(
            status_code=422,
            detail=f"No recognised assay sheets found. Expected sheets: {list(SHEET_TO_ASSAY.keys())}",
        )

    # ── Per-assay validation ───────────────────────────────────────────────
    assay_results: dict[str, AssayValidationResult] = {}
    for assay_key, df in assay_dfs.items():
        result = validate_schema(assay_key, df)
        value_issues = validate_values(assay_key, df)
        result.issues.extend(value_issues)
        # Re-evaluate passed after adding value issues
        result.passed = not any(i.severity == Severity.ERROR for i in result.issues)
        assay_results[assay_key] = result

    # ── Cross-assay sample alignment ───────────────────────────────────────
    alignment, alignment_issues = align_samples(
        assay_dfs, arms_config.post_treatment_timepoints
    )

    # ── Clean data formatter ───────────────────────────────────────────────
    clean_data: dict[str, CleanAssayData] = {}
    for assay_key, df in assay_dfs.items():
        try:
            clean_data[assay_key] = format_assay(
                assay_key, df, arms_config,
                use_feature_selection=use_feature_selection,
            )
        except Exception as e:
            pass  # formatter failure should not block validation response

    # ── Aggregate counts ───────────────────────────────────────────────────
    all_issues = [
        i for r in assay_results.values() for i in r.issues
    ] + alignment_issues

    error_count = sum(1 for i in all_issues if i.severity == Severity.ERROR)
    warning_count = sum(1 for i in all_issues if i.severity == Severity.WARNING)
    overall_passed = error_count == 0 and alignment.total_aligned > 0

    # ── Summary string ─────────────────────────────────────────────────────
    assay_count = len(assay_results)
    if overall_passed:
        summary = (
            f"All {assay_count} assay(s) passed validation. "
            f"{alignment.total_aligned} samples fully aligned across assays. "
            f"{warning_count} warning(s) to review."
        )
    else:
        summary = (
            f"{error_count} error(s) found across {assay_count} assay(s). "
            f"{alignment.total_aligned} samples aligned. "
            f"Resolve errors before proceeding to analysis."
        )

    return ValidationResponse(
        overall_passed=overall_passed,
        total_issues=len(all_issues),
        error_count=error_count,
        warning_count=warning_count,
        assay_results=assay_results,
        alignment=alignment,
        arms_config=arms_config,
        clean_data=clean_data,
        summary=summary,
    )


@app.get("/api/schema/{assay_key}")
def get_schema(assay_key: str):
    """Return the expected schema for a given assay type."""
    if assay_key not in ASSAY_SCHEMAS:
        raise HTTPException(status_code=404, detail=f"Unknown assay: {assay_key}")
    schema = ASSAY_SCHEMAS[assay_key].copy()
    return {"assay": assay_key, "schema": schema}
