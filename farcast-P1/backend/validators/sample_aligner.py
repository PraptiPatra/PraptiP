import pandas as pd
from models.schemas import AlignmentResult, ValidationIssue, Severity


def align_samples(
    assay_dfs: dict[str, pd.DataFrame],
    post_treatment_timepoints: dict[str, str],
) -> tuple[AlignmentResult, list[ValidationIssue]]:
    """
    Find sample IDs present in all assays at the analysis (post-treatment) timepoint.
    Returns an AlignmentResult and any cross-assay issues.
    """
    issues: list[ValidationIssue] = []
    per_assay_samples: dict[str, set[str]] = {}

    for assay_key, df in assay_dfs.items():
        if "Sample_ID" not in df.columns or "Timepoint" not in df.columns:
            per_assay_samples[assay_key] = set()
            continue

        tp = post_treatment_timepoints.get(assay_key, "T72")
        filtered = df[df["Timepoint"] == tp]
        per_assay_samples[assay_key] = set(filtered["Sample_ID"].dropna().astype(str))

    if not per_assay_samples:
        return AlignmentResult(
            fully_aligned_samples=[],
            total_aligned=0,
            missing_per_assay={},
            extra_per_assay={},
        ), issues

    all_sample_sets = list(per_assay_samples.values())
    union_samples = set.union(*all_sample_sets) if all_sample_sets else set()
    intersection = set.intersection(*all_sample_sets) if all_sample_sets else set()

    missing_per_assay: dict[str, list[str]] = {}
    extra_per_assay: dict[str, list[str]] = {}

    for assay_key, samples in per_assay_samples.items():
        missing = sorted(union_samples - samples)
        extra = sorted(samples - intersection)
        if missing:
            missing_per_assay[assay_key] = missing
        if extra:
            extra_per_assay[assay_key] = extra

    # Cross-assay alignment issues
    if len(intersection) < len(union_samples):
        issues.append(ValidationIssue(
            severity=Severity.WARNING,
            code="SAMPLE_ALIGNMENT_MISMATCH",
            message=f"{len(intersection)} of {len(union_samples)} samples are fully aligned across all assays",
            details=(
                f"Only the {len(intersection)} aligned samples will be used for cross-assay analysis. "
                f"{len(union_samples) - len(intersection)} sample(s) are missing from at least one assay."
            ),
        ))

    if len(intersection) == 0:
        issues.append(ValidationIssue(
            severity=Severity.ERROR,
            code="NO_ALIGNED_SAMPLES",
            message="No samples are present across all four assays — cannot proceed with analysis",
            details="Check that the same experiment's files were uploaded",
        ))

    return AlignmentResult(
        fully_aligned_samples=sorted(intersection),
        total_aligned=len(intersection),
        missing_per_assay=missing_per_assay,
        extra_per_assay=extra_per_assay,
    ), issues
