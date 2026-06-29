"""
Feature selection for assay data prior to LLM input.

Two-stage cascade (per meeting notes, 17 Jun 2026):
  Stage 1 — Spearman correlation vs response labels (requires metadata)
            Select features where p-value <= P_VALUE_THRESHOLD
            If >= MIN_FEATURES selected → done
  Stage 2 — If Stage 1 yields < MIN_FEATURES (or no response labels available):
            Sort by |correlation coefficient| (Spearman) or by SD if no labels
            Take top MIN_FEATURES

For assays whose total feature count is <= MIN_FEATURES, skip selection entirely
and return all features (feature selection adds no value on tiny panels like Cytokine).
"""

import pandas as pd
import numpy as np
from scipy import stats
from dataclasses import dataclass

P_VALUE_THRESHOLD = 0.08
MIN_FEATURES = 20


@dataclass
class FeatureSelectionResult:
    selected_features: list[str]
    total_features: int
    method_used: str          # "spearman_pvalue" | "spearman_top_n" | "sd_top_n" | "passthrough"
    skipped: bool             # True when assay is too small to bother
    skip_reason: str | None
    feature_stats: list[dict] # [{feature, rho, p_value, sd}, ...] sorted by selection order


def _get_feature_stats_spearman(
    data: pd.DataFrame, feature_cols: list[str], response: pd.Series
) -> pd.DataFrame:
    """Compute Spearman rho and p-value for each feature vs response."""
    records = []
    for col in feature_cols:
        col_vals = pd.to_numeric(data[col], errors="coerce")
        valid = col_vals.notna() & response.notna()
        if valid.sum() < 4:
            records.append({"feature": col, "rho": np.nan, "p_value": np.nan, "abs_rho": np.nan})
            continue
        rho, p = stats.spearmanr(col_vals[valid], response[valid])
        records.append({"feature": col, "rho": float(rho), "p_value": float(p), "abs_rho": abs(float(rho))})
    return pd.DataFrame(records)


def _get_feature_stats_sd(data: pd.DataFrame, feature_cols: list[str]) -> pd.DataFrame:
    """Compute standard deviation for each feature (fallback when no response labels)."""
    records = []
    for col in feature_cols:
        vals = pd.to_numeric(data[col], errors="coerce").dropna()
        sd = float(vals.std()) if len(vals) >= 2 else 0.0
        records.append({"feature": col, "rho": np.nan, "p_value": np.nan, "sd": sd})
    return pd.DataFrame(records)


def select_features(
    assay_key: str,
    data: pd.DataFrame,
    feature_cols: list[str],
    response_series: pd.Series | None = None,
    min_features: int = MIN_FEATURES,
    p_value_threshold: float = P_VALUE_THRESHOLD,
) -> FeatureSelectionResult:
    """
    Run the two-stage feature selection cascade on a single assay.

    Parameters
    ----------
    assay_key        : name used in logging/metadata
    data             : DataFrame containing feature_cols rows (post-treatment, all arms)
    feature_cols     : biological feature columns to evaluate
    response_series  : numeric/ordinal response labels aligned to data index; None = no labels
    min_features     : minimum features to select (default 20)
    p_value_threshold: Spearman p-value cutoff for Stage 1 (default 0.08)
    """
    n_features = len(feature_cols)

    # ── Passthrough: panel too small to select from ───────────────────────────
    if n_features <= min_features:
        stats_rows = [{"feature": f, "rho": None, "p_value": None, "sd": None} for f in feature_cols]
        return FeatureSelectionResult(
            selected_features=feature_cols,
            total_features=n_features,
            method_used="passthrough",
            skipped=True,
            skip_reason=f"Panel has only {n_features} features (≤ {min_features}); all features retained",
            feature_stats=stats_rows,
        )

    # ── Stage 1: Spearman vs response labels ─────────────────────────────────
    if response_series is not None and response_series.notna().sum() >= 4:
        # Align response to data index
        aligned_response = response_series.reindex(data.index)
        stat_df = _get_feature_stats_spearman(data, feature_cols, aligned_response)
        stat_df["sd"] = [
            float(pd.to_numeric(data[c], errors="coerce").std()) for c in feature_cols
        ]

        # Stage 1a: p-value threshold
        passed = stat_df[stat_df["p_value"] <= p_value_threshold].copy()

        if len(passed) >= min_features:
            passed_sorted = passed.sort_values("p_value")
            selected = passed_sorted["feature"].tolist()
            stats_out = stat_df.sort_values("p_value").to_dict(orient="records")
            return FeatureSelectionResult(
                selected_features=selected,
                total_features=n_features,
                method_used="spearman_pvalue",
                skipped=False,
                skip_reason=None,
                feature_stats=stats_out,
            )

        # Stage 1b: fewer than min_features passed p-value → top N by |rho|
        stat_df_sorted = stat_df.dropna(subset=["abs_rho"]).sort_values("abs_rho", ascending=False)
        selected = stat_df_sorted["feature"].head(min_features).tolist()
        stats_out = stat_df_sorted.to_dict(orient="records")
        return FeatureSelectionResult(
            selected_features=selected,
            total_features=n_features,
            method_used="spearman_top_n",
            skipped=False,
            skip_reason=(
                f"Only {len(passed)} feature(s) passed p≤{p_value_threshold}; "
                f"fell back to top {min_features} by |Spearman rho|"
            ),
            feature_stats=stats_out,
        )

    # ── Stage 2 fallback: no response labels → SD-based selection ────────────
    stat_df = _get_feature_stats_sd(data, feature_cols)
    mean_sd = stat_df["sd"].mean()

    # Stage 2a: SD > mean(SD) threshold
    passed_sd = stat_df[stat_df["sd"] > mean_sd].copy()

    if len(passed_sd) >= min_features:
        passed_sorted = passed_sd.sort_values("sd", ascending=False)
        selected = passed_sorted["feature"].tolist()
        return FeatureSelectionResult(
            selected_features=selected,
            total_features=n_features,
            method_used="sd_threshold",
            skipped=False,
            skip_reason="No response labels available; used SD > mean(SD) threshold",
            feature_stats=stat_df.sort_values("sd", ascending=False).to_dict(orient="records"),
        )

    # Stage 2b: top N by SD
    stat_df_sorted = stat_df.sort_values("sd", ascending=False)
    selected = stat_df_sorted["feature"].head(min_features).tolist()
    return FeatureSelectionResult(
        selected_features=selected,
        total_features=n_features,
        method_used="sd_top_n",
        skipped=False,
        skip_reason=(
            f"No response labels; only {len(passed_sd)} feature(s) exceeded SD threshold; "
            f"fell back to top {min_features} by SD"
        ),
        feature_stats=stat_df_sorted.to_dict(orient="records"),
    )
