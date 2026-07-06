"use client";
import { useState } from "react";
import React from "react";
import { Download, ChevronDown, ChevronRight, Database, Microscope, TestTube2, Waves, Dna, ClipboardList, Sliders, CheckCircle2, SkipForward } from "lucide-react";
import clsx from "clsx";
import { CleanAssayData, FeatureSelectionSummary } from "@/lib/api";

const ASSAY_ICON_MAP: Record<string, React.ElementType> = {
  histopathology: Microscope,
  cytokine: TestTube2,
  flow_cytometry: Waves,
  nanostring: Dna,
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
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
        style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.02)", color: "var(--text-muted)" }}
      >
        <SkipForward className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Feature selection skipped — {fs.skip_reason ?? "small panel, all features retained"}</span>
      </div>
    );
  }
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
      style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)" }}
    >
      <Sliders className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
            {METHOD_LABELS[fs.method_used] ?? fs.method_used}
          </span>
          <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>
            {fs.selected_count} / {fs.total_features} features
          </span>
        </div>
        {fs.skip_reason && (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{fs.skip_reason}</p>
        )}
      </div>
    </div>
  );
}

function DataTable({ data }: { data: CleanAssayData }) {
  const [expanded, setExpanded] = useState(false);
  const isNano = data.assay_name === "nanostring";
  // For NanoString limit visible columns to avoid DOM explosion
  const visibleCols = isNano ? data.columns.slice(0, 10) : data.columns;
  const moreColsCount = data.columns.length - visibleCols.length;
  const rows = expanded ? data.rows : data.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="space-y-3">
      {/* Metadata chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.metadata).map(([k, v]) => {
          if (Array.isArray(v) || typeof v === "object") return null;
          return (
            <span
              key={k}
              className="rounded-lg px-2.5 py-1 text-[10px] font-mono"
              style={{ background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              {k}: <span style={{ color: "var(--accent)" }}>{String(v)}</span>
            </span>
          );
        })}
        {isNano && (
          <span
            className="rounded-lg px-2.5 py-1 text-[10px] font-mono"
            style={{ background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            total columns: <span style={{ color: "var(--accent)" }}>{data.columns.length}</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--surface-raised)" }}>
              {visibleCols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium whitespace-nowrap border-b"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
                >
                  {col}
                </th>
              ))}
              {moreColsCount > 0 && (
                <th
                  className="px-3 py-2 text-left font-medium whitespace-nowrap border-b"
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
                className="transition-colors hover:bg-white/[0.015]"
                style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--border-subtle)" : undefined }}
              >
                {visibleCols.map((col) => {
                  const val = row[col];
                  return (
                    <td
                      key={col}
                      className="px-3 py-2 whitespace-nowrap font-mono"
                      style={{ color: typeof val === "number" ? "var(--accent)" : "var(--text-primary)" }}
                    >
                      {val === null || val === undefined ? (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      ) : typeof val === "number" ? (
                        Number.isInteger(val) ? String(val) : val.toFixed(3)
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
                {moreColsCount > 0 && <td />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.rows.length > PREVIEW_ROWS && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
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
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Validated Output
          </h3>
          <span className="text-[10px] rounded px-2 py-0.5 border font-mono" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            structured
          </span>
        </div>
        <button
          onClick={downloadAll}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-500/10"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          <Download className="h-3.5 w-3.5" />
          Export All
        </button>
      </div>

      {/* Assay tabs */}
      <div className="flex gap-1 flex-wrap">
        {Object.entries(cleanData).map(([key, d]) => (
          <button
            key={key}
            onClick={() => setOpenAssay(openAssay === key ? null : key)}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all"
            )}
            style={
              openAssay === key
                ? { background: "rgba(59,130,246,0.15)", borderColor: "var(--accent)", color: "var(--accent)" }
                : { background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" }
            }
          >
            {(() => { const Icon = ASSAY_ICON_MAP[key] ?? ClipboardList; return <Icon className="h-3.5 w-3.5" />; })()}
            {d.display_name}
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
            >
              n={d.n_samples}
            </span>
          </button>
        ))}
      </div>

      {/* Active assay data */}
      {openAssay && cleanData[openAssay] && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => { const Icon = ASSAY_ICON_MAP[openAssay] ?? ClipboardList; return <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />; })()}
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {cleanData[openAssay].display_name}
              </span>
            </div>
            <button
              onClick={() => downloadJSON(cleanData[openAssay])}
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <Download className="h-3 w-3" />
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
