from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from enum import Enum


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationIssue(BaseModel):
    severity: Severity
    code: str
    message: str
    details: Optional[str] = None
    affected_rows: Optional[list[str]] = None  # sample IDs affected


class AssayValidationResult(BaseModel):
    assay_name: str
    display_name: str
    passed: bool
    row_count: int
    col_count: int
    issues: list[ValidationIssue] = []
    sample_ids: list[str] = []
    timepoints: list[str] = []
    arms: list[str] = []


class AlignmentResult(BaseModel):
    fully_aligned_samples: list[str]
    total_aligned: int
    missing_per_assay: dict[str, list[str]]  # assay -> samples missing from it
    extra_per_assay: dict[str, list[str]]


class ArmsConfig(BaseModel):
    control_arm: str = "Rx-A"
    treated_arms: list[str] = ["Rx-B", "Rx-C"]
    baseline_timepoints: dict[str, str] = Field(
        default={
            "histopathology": "TBL",
            "cytokine": "T0",
            "flow_cytometry": "T72",
            "nanostring": "T72",
        }
    )
    post_treatment_timepoints: dict[str, str] = Field(
        default={
            "histopathology": "T72",
            "cytokine": "Tavg",
            "flow_cytometry": "T72",
            "nanostring": "T72",
        }
    )


class FeatureStatEntry(BaseModel):
    feature: str
    rho: Optional[float] = None
    p_value: Optional[float] = None
    sd: Optional[float] = None


class FeatureSelectionSummary(BaseModel):
    selected_features: list[str]
    total_features: int
    selected_count: int
    method_used: str
    skipped: bool
    skip_reason: Optional[str] = None
    feature_stats: list[FeatureStatEntry] = []


class CleanAssayData(BaseModel):
    assay_name: str
    display_name: str
    n_samples: int
    columns: list[str]
    rows: list[dict]
    metadata: dict  # arms, timepoints, special columns info
    feature_selection: Optional[FeatureSelectionSummary] = None


class ValidationResponse(BaseModel):
    overall_passed: bool
    total_issues: int
    error_count: int
    warning_count: int
    assay_results: dict[str, AssayValidationResult]
    alignment: AlignmentResult
    arms_config: ArmsConfig
    clean_data: Optional[dict[str, CleanAssayData]] = None
    summary: str


# ── Analysis models ────────────────────────────────────────────────────────────

class FeatureCitation(BaseModel):
    name: str
    rho: Optional[float] = None
    p_value: Optional[float] = None
    direction: str = "na"  # positive | negative | na


class ResearchRef(BaseModel):
    citation: str
    relevance: str


class AnalysisFinding(BaseModel):
    id: str
    title: str
    assay: str
    category: str  # immune_effector | cytokine_signature | gene_expression | immune_suppression | immune_exclusion | other
    features_cited: list[FeatureCitation]
    interpretation: str
    clinical_implication: str
    confidence: str  # high | medium | low
    confidence_rationale: str
    research_refs: list[ResearchRef]


class CrossAssayTheme(BaseModel):
    theme: str
    description: str
    supporting_findings: list[str]


class AnalysisResponse(BaseModel):
    findings: list[AnalysisFinding]
    cross_assay_themes: list[CrossAssayTheme]
    overall_interpretation: str


class AnalyzeRequest(BaseModel):
    clean_data: dict[str, Any]
    arms_config: ArmsConfig


class SummaryRequest(BaseModel):
    findings: list[AnalysisFinding]
    approved_ids: list[str]
    overall_interpretation: str
    cross_assay_themes: list[CrossAssayTheme]
    arms_config: ArmsConfig


class SummarySection(BaseModel):
    heading: str
    content: str
    finding_ids: list[str] = []


class SummaryResponse(BaseModel):
    title: str
    executive_summary: str
    sections: list[SummarySection]
    conclusions: list[str]
    limitations: str
    methodology_note: str
