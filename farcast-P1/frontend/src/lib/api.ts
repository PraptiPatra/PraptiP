export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface FeatureStatEntry {
  feature: string;
  rho: number | null;
  p_value: number | null;
  sd: number | null;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  details?: string;
  affected_rows?: string[];
}

export interface AssayValidationResult {
  assay_name: string;
  display_name: string;
  passed: boolean;
  row_count: number;
  col_count: number;
  issues: ValidationIssue[];
  sample_ids: string[];
  timepoints: string[];
  arms: string[];
}

export interface AlignmentResult {
  fully_aligned_samples: string[];
  total_aligned: number;
  missing_per_assay: Record<string, string[]>;
  extra_per_assay: Record<string, string[]>;
}

export interface ArmsConfig {
  control_arm: string;
  treated_arms: string[];
  baseline_timepoints: Record<string, string>;
  post_treatment_timepoints: Record<string, string>;
}

export interface FeatureSelectionSummary {
  selected_features: string[];
  total_features: number;
  selected_count: number;
  method_used: "spearman_pvalue" | "spearman_top_n" | "sd_threshold" | "sd_top_n" | "passthrough";
  skipped: boolean;
  skip_reason?: string;
  feature_stats?: FeatureStatEntry[];
}

export interface CleanAssayData {
  assay_name: string;
  display_name: string;
  n_samples: number;
  columns: string[];
  rows: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  feature_selection?: FeatureSelectionSummary;
}

export interface ValidationResponse {
  overall_passed: boolean;
  total_issues: number;
  error_count: number;
  warning_count: number;
  assay_results: Record<string, AssayValidationResult>;
  alignment: AlignmentResult;
  arms_config: ArmsConfig;
  clean_data: Record<string, CleanAssayData> | null;
  summary: string;
}

export async function validateFile(
  file: File,
  armsConfig: ArmsConfig,
  useFeatureSelection: boolean = true
): Promise<ValidationResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("arms_config_json", JSON.stringify(armsConfig));
  formData.append("use_feature_selection", String(useFeatureSelection));

  const res = await fetch(`${API_BASE}/api/validate`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Analysis types ────────────────────────────────────────────────────────────

export interface FeatureCitation {
  name: string;
  rho: number | null;
  p_value: number | null;
  direction: string;
}

export interface ResearchRef {
  citation: string;
  relevance: string;
}

export interface AnalysisFinding {
  id: string;
  title: string;
  assay: string;
  category: string;
  features_cited: FeatureCitation[];
  interpretation: string;
  clinical_implication: string;
  confidence: "high" | "medium" | "low";
  confidence_rationale: string;
  research_refs: ResearchRef[];
}

export interface CrossAssayTheme {
  theme: string;
  description: string;
  supporting_findings: string[];
}

export interface AnalysisResponse {
  findings: AnalysisFinding[];
  cross_assay_themes: CrossAssayTheme[];
  overall_interpretation: string;
}

export interface SummarySection {
  heading: string;
  content: string;
  finding_ids: string[];
}

export interface SummaryResponse {
  title: string;
  executive_summary: string;
  sections: SummarySection[];
  conclusions: string[];
  limitations: string;
  methodology_note: string;
}

export async function runAnalysis(
  cleanData: Record<string, CleanAssayData>,
  armsConfig: ArmsConfig
): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clean_data: cleanData, arms_config: armsConfig }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function generateSummary(
  findings: AnalysisFinding[],
  approvedIds: string[],
  overallInterpretation: string,
  crossAssayThemes: CrossAssayTheme[],
  armsConfig: ArmsConfig
): Promise<SummaryResponse> {
  const res = await fetch(`${API_BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      findings,
      approved_ids: approvedIds,
      overall_interpretation: overallInterpretation,
      cross_assay_themes: crossAssayThemes,
      arms_config: armsConfig,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const DEFAULT_ARMS_CONFIG: ArmsConfig = {
  control_arm: "Rx-A",
  treated_arms: ["Rx-B", "Rx-C"],
  baseline_timepoints: {
    histopathology: "TBL",
    cytokine: "T0",
    flow_cytometry: "T72",
    nanostring: "T72",
  },
  post_treatment_timepoints: {
    histopathology: "T72",
    cytokine: "Tavg",
    flow_cytometry: "T72",
    nanostring: "T72",
  },
};
