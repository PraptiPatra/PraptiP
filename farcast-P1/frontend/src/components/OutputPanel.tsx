"use client";
import { useState } from "react";
import React from "react";
import { Download, ChevronDown, ChevronRight, Database, Microscope, TestTube as TestTube2, Save as Waves, Dna, ClipboardList, FileSliders as Sliders, CircleCheck as CheckCircle2, SkipForward } from "lucide-react";
import clsx from "clsx";
import { CleanAssayData, FeatureSelectionSummary } from "@/lib/api";

const ASSAY_CONFIG: Record<string, { icon: React.ElementType; color: string; light: string }> = {
  histopathology: { icon: Microscope, color: "var(--histopathology)", light: "var(--histopathology-light)" },
  cytokine: { icon: TestTube2, color: "var(--cytokine)", light: "var(--cytokine-light)" },
  flow_cytometry: { icon: Waves, color: "var(--flow-cytometry)", light: "var(--flow-cytometry-light)" },
  nanostring: { icon: Dna, color: "var(--nanostring)", light: "var(--nanostring-light)" },
};

const PREVIEW_ROWS = 5;

const METHOD_LABELS: Record<string, string> = {
  spearman_pvalue: "Spearman p≤0.08",
  spearman_top_n:  "Spearman top-20",
  sd_threshold:    "SD threshold",
  sd_top_n:        "SD top-20",
  passthrough:     "Passthrough",
};

function FeatureSelectionBadge({ fs }: { fs: FeatureSelectionSummary }) {
  if (fs.skipped) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--background-alt)", color: "var(--text-muted)" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--surface)" }}>
          <SkipForward className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        </div>
        <span>Feature selection skipped — {fs.skip_reason ?? "small panel, all features retained"}</span>
      </div>
    );
  }
  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--accent-light)", background: "var(--accent-bg)" }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: "var(--accent-light)" }}>
        <Sliders className="h-4 w-4" style={{ color: "var(--accent)" }} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {METHOD_LABELS[fs.method_used] ?? fs.method_used}
          </span>
          <span className="text-xs rounded-lg px-2.5 py-1 font-medium" style={{ background: "var(--accent)", color: "white" }}>
            {fs.selected_count} / {fs.total_features} features
          </span>
        </div>
        {fs.skip_reason && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{fs.skip_reason}</p>
        )}
      </div>
    </div>
  );
}

function DataTable({ data }: { data: CleanAssayData }) {
  const [expanded, setExpanded] = useState(false);
  const isNano = data.assay_name === "nanostring";
  const config = ASSAY_CONFIG[data.assay_name] || { color: "var(--accent)", light: "var(--accent-light)" };
  // For NanoString limit visible columns to avoid DOM explosion
  const visibleCols = isNano ? data.columns.slice(0, 10) : data.columns;
  const moreColsCount = data.columns.length - visibleCols.length;
  const rows = expanded ? data.rows : data.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="space-y-4">
      {/* Metadata chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.metadata).map(([k, v]) => {
          if (Array.isArray(v) || typeof v === "object") return null;
          return (
            <span
              key={k}
              className="rounded-xl px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--background-alt)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              {k}: <span style={{ color: config.color }}>{String(v)}</span>
            </span>
          );
        })}
        {isNano && (
          <span
            key="total_cols"
            className="rounded-xl px-3 py-1.5 text-xs font-medium"
            style={{ background: "var(--background-alt)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            total columns: <span style={{ color: config.color }}>{data.columns.length}</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--background-alt)" }}>
              {visibleCols.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-semibold whitespace-nowrap border-b"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                >
                  {col}
                </th>
              ))}
              {moreColsCount > 0 && (
                <th
                  className="px-4 py-3 text-left font-medium whitespace-nowrap border-b"
                  style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
                >
                  +{moreColsCount} more cols
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="transition-colors"
                style={{
                  borderBottom: ri < rows.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                  background: ri % 2 === 0 ? "var(--surface)" : "var(--background)"
                }}
              >
                {visibleCols.map((col) => {
                  const val = row[col];
                  return (
                    <td
                      key={col}
                      className="px-4 py-2.5 whitespace-nowrap font-mono text-xs"
                      style={{ color: typeof val === "number" ? config.color : "var(--text-primary)" }}
                    >
                      {val === null || val === undefined ? (
                        <span style={{ color: "var(--text-faint)" }}>—</span>
                      ) : typeof val === "number" ? (
                        Number.isInteger(val) ? String(val) : val.toFixed(3)
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
                {moreColsCount > 0 && <td style={{ background: "transparent" }} />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.rows.length > PREVIEW_ROWS && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 transition-all"
          style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {expanded ? "Show less" : `Show all ${data.rows.length} rows`}
        </button>
      )}
    </div>
  );
}

function downloadJSON(data: CleanAssayData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.assay_name}_clean.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OutputPanel({ cleanData }: { cleanData: Record<string, CleanAssayData> }) {
  const [openAssay, setOpenAssay] = useState<string | null>(Object.keys(cleanData)[0] ?? null);

  const downloadAll = () => {
    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "farcast_validated_data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-bg)" }}
          >
            <Database className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Validated Output
            </h3>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Structured data ready for downstream analysis
            </span>
          </div>
        </div>
        <button
          onClick={downloadAll}
          className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all"
          style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-bg)" }}
        >
          <Download className="h-4 w-4" />
          Export All
        </button>
      </div>

      {/* Assay tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(cleanData).map(([key, d]) => {
          const config = ASSAY_CONFIG[key] || { color: "var(--accent)", light: "var(--accent-light)" };
          const Icon = config.icon || ClipboardList;
          const isActive = openAssay === key;

          return (
            <button
              key={key}
              onClick={() => setOpenAssay(openAssay === key ? null : key)}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border-2 transition-all"
              )}
              style={
                isActive
                  ? { background: config.light, borderColor: config.color, color: config.color, boxShadow: `0 2px 8px ${config.color}20` }
                  : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }
              }
            >
              <Icon className="h-4 w-4" />
              {d.display_name}
              <span
                className="rounded-lg px-2 py-0.5 text-xs font-semibold"
                style={{ background: isActive ? "var(--surface)" : "var(--background-alt)", color: isActive ? config.color : "var(--text-muted)" }}
              >
                n={d.n_samples}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active assay data */}
      {openAssay && cleanData[openAssay] && (
        <div
          className="card-premium p-6 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const config = ASSAY_CONFIG[openAssay] || { icon: ClipboardList, color: "var(--accent)" };
                const Icon = config.icon;
                return (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${config.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: config.color }} />
                  </div>
                );
              })()}
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {cleanData[openAssay].display_name}
              </span>
            </div>
            <button
              onClick={() => downloadJSON(cleanData[openAssay])}
              className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
              style={{ color: "var(--text-secondary)", background: "var(--background-alt)" }}
            >
              <Download className="h-3.5 w-3.5" />
              JSON
            </button>
          </div>
          {cleanData[openAssay].feature_selection && (
            <FeatureSelectionBadge fs={cleanData[openAssay].feature_selection!} />
          )}
          <DataTable data={cleanData[openAssay]} />
        </div>
      )}
    </div>
  );
}
