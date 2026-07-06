"""
Feature selection for assay data prior to LLM input.

Two-stage cascade (per Farcast method, scipy.stats.spearmanr matrix form):
  Stage 1 — Spearman correlation vs response labels (requires metadata)
            Build samples x (features + response) matrix, run spearmanr() once.
            Select features where p-value <= P_VALUE_THRESHOLD and >= MIN_FEATURES pass.
            If < MIN_FEATURES pass threshold, fall back to top MIN_FEATURES by |rho|.
  Stage 2 — No response labels: SD-based selection
            SD > mean(SD) threshold; if < MIN_FEATURES, top MIN_FEATURES by SD.

For assays whose total feature count is <= MIN_FEATURES, skip selection entirely.
"""

import pandas as pd
import numpy as np
from scipy.stats import spearmanr
from dataclasses import dataclass

P_VALUE_THRESHOLD = 0.08
MIN_FEATURES = 20

RESPONSE_ORDER = {"NR": 0, "MR": 1, "R": 2}


@dataclass
class FeatureSelectionResult:
    selected_features: list[str]
    total_features: int
    method_used: str          # "spearman_pvalue" | "spearman_top_n" | "sd_threshold" | "sd_top_n" | "passthrough"
    skipped: bool
    skip_reason: str | None
    feature_stats: list[dict] # [{feature, rho, p_value, sd}, ...] sorted by selection order


def _spearman_vs_response(
    data: pd.DataFrame, feature_cols: list[str], response: pd.Series
) -> pd.DataFrame:
    """
    Use spearmanr(matrix) — the company-specified method.
    Builds a samples x (features + __response__) matrix, runs spearmanr once,
    then extracts the response row/column for each feature.
    """
    # Coerce all feature cols to numeric
    feat_df = data[feature_cols].apply(pd.to_numeric, errors="coerce")
    # Align response to data index
    resp_aligned = response.reindex(data.index)

    # Drop rows where response is NaN
    valid_mask = resp_aligned.notna()
    feat_df = feat_df[valid_mask]
    resp_vals = resp_aligned[valid_mask].values

    if len(feat_df) < 4:
        empty = [{"feature": c, "rho": np.nan, "p_value": np.nan, "abs_rho": np.nan} for c in feature_cols]
        return pd.DataFrame(empty)

    # Build matrix: samples x (features + response)
    matrix = feat_df.copy()
    matrix["__response__"] = resp_vals

    # Run spearmanr on full matrix — returns (n_cols x n_cols) rho and p-value arrays
    rho_mat, p_mat = spearmanr(matrix.values)
    resp_idx = len(feature_cols)  # last column index

    records = []
    for i, col in enumerate(feature_cols):
        rho = float(rho_mat[i, resp_idx])
        p   = float(p_mat[i, resp_idx])
        records.append({"feature": col, "rho": rho, "p_value": p, "abs_rho": abs(rho)})

    return pd.DataFrame(records)


def _sd_stats(data: pd.DataFrame, feature_cols: list[str]) -> pd.DataFrame:
    records = []
    for col in feature_cols:
        vals = pd.to_numeric(data[col], errors="coerce").dropna()
        sd = float(vals.std()) if len(vals) >= 2 else 0.0
        records.append({"feature": col, "rho": np.nan, "p_value": np.nan, "sd": sd})
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
    Two-stage feature selection cascade.

    response_series: ordinal-encoded Series (R=2, MR=1, NR=0) aligned to data index.
    """
    n_features = len(feature_cols)

    # ── Passthrough: panel too small ─────────────────────────────────────────
    if n_features <= min_features:
        stats_rows = [{"feature": f, "rho": None, "p_value": None, "sd": None} for f in feature_cols]
        return FeatureSelectionResult(
            selected_features=feature_cols,
            total_features=n_features,
            method_used="passthrough",
            skipped=True,
            skip_reason=f"Panel has only {n_features} features (<= {min_features}); all features retained",
            feature_stats=stats_rows,
        )

    # ── Stage 1: Spearman matrix vs response labels ───────────────────────────
    if response_series is not None and response_series.notna().sum() >= 4:
        stat_df = _spearman_vs_response(data, feature_cols, response_series)
        stat_df["sd"] = [
            float(pd.to_numeric(data[c], errors="coerce").std()) for c in feature_cols
        ]

        # Stage 1a: p-value threshold
        passed = stat_df[stat_df["p_value"] <= p_value_threshold].copy()
        if len(passed) >= min_features:
            selected = passed.sort_values("p_value")["feature"].tolist()
            return FeatureSelectionResult(
                selected_features=selected,
                total_features=n_features,
                method_used="spearman_pvalue",
                skipped=False,
                skip_reason=None,
                feature_stats=stat_df.sort_values("p_value").to_dict(orient="records"),
            )

        # Stage 1b: top N by |rho|
        stat_df_sorted = stat_df.dropna(subset=["abs_rho"]).sort_values("abs_rho", ascending=False)
        selected = stat_df_sorted["feature"].head(min_features).tolist()
        return FeatureSelectionResult(
            selected_features=selected,
            total_features=n_features,
            method_used="spearman_top_n",
            skipped=False,
            skip_reason=(
                f"Only {len(passed)} feature(s) passed p<={p_value_threshold}; "
                f"fell back to top {min_features} by |Spearman rho|"
            ),
            feature_stats=stat_df_sorted.to_dict(orient="records"),
        )

    # ── Stage 2 fallback: SD-based ────────────────────────────────────────────
    stat_df = _sd_stats(data, feature_cols)
    mean_sd = stat_df["sd"].mean()
    passed_sd = stat_df[stat_df["sd"] > mean_sd].copy()

    if len(passed_sd) >= min_features:
        selected = passed_sd.sort_values("sd", ascending=False)["feature"].tolist()
        return FeatureSelectionResult(
            selected_features=selected,
            total_features=n_features,
            method_used="sd_threshold",
            skipped=False,
            skip_reason="No response labels available; used SD > mean(SD) threshold",
            feature_stats=stat_df.sort_values("sd", ascending=False).to_dict(orient="records"),
        )

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
