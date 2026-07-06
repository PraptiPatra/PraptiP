"""
LLM analyzer — builds structured prompts from clean assay data and calls Sarvam AI.
Uses OpenAI-compatible client pointed at api.sarvam.ai.
"""

import os
import json
import re
from openai import OpenAI

from models.schemas import (
    AnalysisFinding, AnalysisResponse, CrossAssayTheme, FeatureCitation, ResearchRef,
    SummaryRequest, SummaryResponse, SummarySection, ArmsConfig,
)

SARVAM_BASE_URL = "https://api.sarvam.ai/v1"
SARVAM_MODEL = "sarvam-m"

ASSAY_DISPLAY = {
    "histopathology": "Histopathology (H&E + IHC)",
    "cytokine": "Cytokine Panel",
    "flow_cytometry": "Flow Cytometry",
    "nanostring": "NanoString Gene Expression",
}


def _get_client() -> OpenAI:
    api_key = os.environ.get("SARVAM_API_KEY")
    if not api_key:
        raise ValueError("SARVAM_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key, base_url=SARVAM_BASE_URL)


def _format_feature_table(feature_stats: list[dict], max_rows: int = 60) -> str:
    rows = feature_stats[:max_rows]
    if not rows:
        return "  (no feature statistics available)"
    lines = ["  Feature | ρ (Spearman) | p-value | Direction"]
    lines.append("  --------|------------|---------|----------")
    for s in rows:
        rho = s.get("rho")
        pval = s.get("p_value")
        rho_str = f"{rho:+.3f}" if rho is not None else "n/a"
        pval_str = f"{pval:.4f}" if pval is not None else "n/a"
        if rho is not None:
            direction = "↑ positive" if rho > 0 else "↓ negative"
        else:
            sd = s.get("sd")
            direction = f"SD={sd:.3f}" if sd is not None else "n/a"
        lines.append(f"  {s['feature']} | {rho_str} | {pval_str} | {direction}")
    if len(feature_stats) > max_rows:
        lines.append(f"  ... and {len(feature_stats) - max_rows} more features")
    return "\n".join(lines)


def _build_analysis_prompt(clean_data: dict, arms_config: ArmsConfig) -> str:
    sections = []
    sections.append(f"""## Study Design
- **Cohort**: n=16 patients (Farcast TruTumor study)
- **Control arm**: {arms_config.control_arm}
- **Treatment arms**: {', '.join(arms_config.treated_arms)}
- **Response categories**: R (Responder, ordinal=2), MR (Mixed Responder, ordinal=1), NR (Non-Responder, ordinal=0)
- **Feature selection**: Spearman rank correlation matrix — features selected at p ≤ 0.08 (fallback: top-20 by |ρ|)
""")

    for assay_key, assay_data in clean_data.items():
        display = ASSAY_DISPLAY.get(assay_key, assay_key)
        n_samples = assay_data.get("n_samples", "?")
        fs = assay_data.get("feature_selection")

        header = f"### {display} ({n_samples} samples)"

        if fs:
            method_map = {
                "spearman_pvalue": "Spearman p≤0.08",
                "spearman_top_n": "Spearman top-20 by |ρ|",
                "sd_threshold": "SD > mean(SD)",
                "sd_top_n": "SD top-20",
                "passthrough": "Passthrough (small panel)",
            }
            method_label = method_map.get(fs.get("method_used", ""), fs.get("method_used", ""))
            total = fs.get("total_features", "?")
            selected = fs.get("selected_count", "?")
            header += f"\n- Feature selection: {method_label} → {selected}/{total} features retained"
            if fs.get("skip_reason"):
                header += f"\n- Note: {fs['skip_reason']}"
            stats = fs.get("feature_stats", [])
            if stats:
                header += f"\n\n**Selected features with response correlation (Spearman ρ vs R/MR/NR):**\n"
                header += _format_feature_table(stats)
        else:
            cols = assay_data.get("columns", [])
            bio_cols = [c for c in cols if c not in {"Sample_ID", "Arms", "Timepoint", "Response"}]
            header += f"\n- Features: {len(bio_cols)} columns"
            if bio_cols:
                header += f"\n- Columns: {', '.join(bio_cols[:30])}"
                if len(bio_cols) > 30:
                    header += f" ... (+{len(bio_cols)-30} more)"

        sections.append(header)

    return "\n\n".join(sections)


def _extract_json(text: str) -> dict:
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    raise ValueError("No JSON object found in model response")


def _parse_analysis_response(raw: dict) -> AnalysisResponse:
    findings = []
    for f in raw.get("findings", []):
        features = [
            FeatureCitation(
                name=fc.get("name", ""),
                rho=fc.get("rho"),
                p_value=fc.get("p_value"),
                direction=fc.get("direction", "na"),
            )
            for fc in f.get("features_cited", [])
        ]
        refs = [
            ResearchRef(citation=r.get("citation", ""), relevance=r.get("relevance", ""))
            for r in f.get("research_refs", [])
        ]
        findings.append(AnalysisFinding(
            id=f.get("id", f"f{len(findings)+1}"),
            title=f.get("title", "Untitled Finding"),
            assay=f.get("assay", "unknown"),
            category=f.get("category", "other"),
            features_cited=features,
            interpretation=f.get("interpretation", ""),
            clinical_implication=f.get("clinical_implication", ""),
            confidence=f.get("confidence", "medium"),
            confidence_rationale=f.get("confidence_rationale", ""),
            research_refs=refs,
        ))

    themes = [
        CrossAssayTheme(
            theme=t.get("theme", ""),
            description=t.get("description", ""),
            supporting_findings=t.get("supporting_findings", []),
        )
        for t in raw.get("cross_assay_themes", [])
    ]

    return AnalysisResponse(
        findings=findings,
        cross_assay_themes=themes,
        overall_interpretation=raw.get("overall_interpretation", ""),
    )


def run_analysis(clean_data: dict, arms_config: ArmsConfig) -> AnalysisResponse:
    client = _get_client()
    data_section = _build_analysis_prompt(clean_data, arms_config)

    system_prompt = """You are a senior translational immunologist and oncology data scientist specializing in tumor microenvironment (TiME) profiling and biomarker discovery for cancer immunotherapy.

Your task is to analyze multi-modal immunological assay data from a clinical study and identify biologically meaningful findings. For each finding:
- Ground it in specific quantitative features (Spearman ρ and p-values)
- Explain the biological mechanism with precision
- Cite real published research from your training knowledge
- Assess confidence based on statistical evidence strength

Be precise, evidence-based, and clinically relevant. Prioritize findings with strong statistical support (|ρ| > 0.4, p < 0.05). Do not fabricate statistics not present in the data."""

    user_prompt = f"""Analyze the following multi-modal immunological assay data from the Farcast TruTumor study.

{data_section}

Identify the most significant biological findings. Focus on:
1. Features with strong positive/negative Spearman correlation to treatment response
2. Potential biomarkers that distinguish Responders (R) from Non-Responders (NR)
3. Cross-assay convergence (e.g., flow cytometry + NanoString both pointing to same biology)
4. Suppressive immune mechanisms that may explain non-response
5. Cytokine/gene expression signatures associated with response or resistance

Return ONLY a valid JSON object in exactly this format (no text before or after):

{{
  "findings": [
    {{
      "id": "f1",
      "title": "Concise biological finding title",
      "assay": "flow_cytometry",
      "category": "immune_effector",
      "features_cited": [
        {{"name": "feature_name", "rho": 0.72, "p_value": 0.003, "direction": "positive"}}
      ],
      "interpretation": "Detailed mechanistic interpretation (3-5 sentences). Explain the biology, why this feature correlates with response, and what it tells us about the tumor microenvironment.",
      "clinical_implication": "What this finding means for predicting response, patient stratification, or combination therapy design.",
      "confidence": "high",
      "confidence_rationale": "Why you assigned this confidence level based on the statistics.",
      "research_refs": [
        {{
          "citation": "Author et al. (Year) Full title. Journal Name. DOI if known.",
          "relevance": "How this specific paper supports the finding above."
        }}
      ]
    }}
  ],
  "cross_assay_themes": [
    {{
      "theme": "Theme name",
      "description": "How multiple assay modalities converge on this biological theme.",
      "supporting_findings": ["f1", "f3"]
    }}
  ],
  "overall_interpretation": "2-3 sentence synthesis of the most clinically significant patterns across all assay modalities."
}}

Generate 6-10 findings covering the most important patterns. Include 2-3 cross-assay themes. Each finding must cite at least 2 published references."""

    response = client.chat.completions.create(
        model=SARVAM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=8000,
        temperature=0.2,
    )

    text_content = response.choices[0].message.content or ""
    raw = _extract_json(text_content)
    return _parse_analysis_response(raw)


def run_summarize(request: SummaryRequest) -> SummaryResponse:
    client = _get_client()

    approved = [f for f in request.findings if f.id in set(request.approved_ids)]
    if not approved:
        raise ValueError("No findings were approved")

    findings_text = []
    for f in approved:
        feat_list = ", ".join(
            f"{fc.name} (ρ={fc.rho:+.3f})" if fc.rho is not None else fc.name
            for fc in f.features_cited[:4]
        )
        findings_text.append(
            f"[{f.id}] {f.title} ({f.assay}, confidence: {f.confidence})\n"
            f"  Features: {feat_list}\n"
            f"  Interpretation: {f.interpretation}\n"
            f"  Clinical implication: {f.clinical_implication}"
        )

    themes_text = "\n".join(
        f"- {t.theme}: {t.description} (supported by {', '.join(t.supporting_findings)})"
        for t in request.cross_assay_themes
        if any(fid in request.approved_ids for fid in t.supporting_findings)
    )

    system_prompt = """You are a senior translational immunologist writing a scientific summary report for a clinical team reviewing immunotherapy response biomarkers.
Write with precision, clarity, and appropriate scientific caution. Structure the report for both scientific and clinical audiences."""

    user_prompt = f"""Generate a comprehensive clinical summary report based on the following approved immunological findings from the Farcast TruTumor multi-modal assay study (n=16).

## APPROVED FINDINGS:
{chr(10).join(findings_text)}

## CROSS-ASSAY THEMES:
{themes_text}

## OVERALL INTERPRETATION:
{request.overall_interpretation}

## STUDY ARMS:
- Control: {request.arms_config.control_arm}
- Treatment: {', '.join(request.arms_config.treated_arms)}

Return ONLY valid JSON:

{{
  "title": "Farcast TruTumor TiME Analysis Report — [brief subtitle]",
  "executive_summary": "3-4 sentence high-level summary of the most critical findings and their implications for treatment response prediction.",
  "sections": [
    {{
      "heading": "Section title",
      "content": "Detailed section content (3-5 sentences). Synthesize the approved findings into a coherent narrative.",
      "finding_ids": ["f1", "f2"]
    }}
  ],
  "conclusions": [
    "Conclusion 1: A specific, actionable conclusion",
    "Conclusion 2: ...",
    "Conclusion 3: ..."
  ],
  "limitations": "1-2 sentences on study limitations.",
  "methodology_note": "Brief note on the Spearman rank correlation matrix feature selection method."
}}

Include 4-6 sections covering: immune effector mechanisms, suppressive biology, key biomarkers, cross-assay convergence, and clinical implications."""

    response = client.chat.completions.create(
        model=SARVAM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=5000,
        temperature=0.2,
    )

    text_content = response.choices[0].message.content or ""
    raw = _extract_json(text_content)

    sections = [
        SummarySection(
            heading=s.get("heading", ""),
            content=s.get("content", ""),
            finding_ids=s.get("finding_ids", []),
        )
        for s in raw.get("sections", [])
    ]

    return SummaryResponse(
        title=raw.get("title", "Farcast TruTumor TiME Analysis Report"),
        executive_summary=raw.get("executive_summary", ""),
        sections=sections,
        conclusions=raw.get("conclusions", []),
        limitations=raw.get("limitations", ""),
        methodology_note=raw.get("methodology_note", ""),
    )
