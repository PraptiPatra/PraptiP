"use client";
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  ChevronDown, ChevronRight, Users, FlaskConical,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { ValidationResponse, ValidationIssue, AssayValidationResult } from "@/lib/api";

// ── helpers ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  error: {
    icon: XCircle,
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.3)",
    text: "#ef4444",
    badge: "bg-red-500/15 text-red-400",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.3)",
    text: "#f59e0b",
    badge: "bg-yellow-500/15 text-yellow-400",
    label: "Warning",
  },
  info: {
    icon: Info,
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.3)",
    text: "#6366f1",
    badge: "bg-indigo-500/15 text-indigo-400",
    label: "Info",
  },
};

const ASSAY_ICONS: Record<string, string> = {
  histopathology: "🔬",
  cytokine: "🧪",
  flow_cytometry: "🌊",
  nanostring: "🧬",
};

// ── sub-components ─────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-lg border p-3 space-y-1.5"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: cfg.text }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("text-[10px] font-mono rounded px-1.5 py-0.5", cfg.badge)}>
              {issue.code}
            </span>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {issue.message}
            </span>
          </div>
          {issue.details && (
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {issue.details}
            </p>
          )}
          {issue.affected_rows && issue.affected_rows.length > 0 && (
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 mt-1.5 text-xs hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {issue.affected_rows.length} affected sample(s)
            </button>
          )}
          {open && issue.affected_rows && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {issue.affected_rows.map((id) => (
                <span
                  key={id}
                  className="text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{ background: "var(--surface-raised)", color: "var(--text-secondary)" }}
                >
                  {id}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssayCard({ result }: { result: AssayValidationResult }) {
  const [open, setOpen] = useState(!result.passed);
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: result.passed ? "var(--border)" : "rgba(239,68,68,0.35)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
        style={{ background: "var(--surface-raised)" }}
      >
        <span className="text-lg">{ASSAY_ICONS[result.assay_name] ?? "📋"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {result.display_name}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {result.row_count} rows · {result.col_count} cols
            </span>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              TP: {result.timepoints.join(", ")}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Arms: {result.arms.join(", ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {errors.length > 0 && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-500/15 text-red-400">
              <XCircle className="h-3 w-3" /> {errors.length}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-500/15 text-yellow-400">
              <AlertTriangle className="h-3 w-3" /> {warnings.length}
            </span>
          )}
          {result.passed && errors.length === 0 && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Pass
            </span>
          )}
          {open ? (
            <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </button>

      {open && result.issues.length > 0 && (
        <div
          className="px-4 py-3 space-y-2 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {result.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
      {open && result.issues.length === 0 && (
        <div
          className="px-4 py-3 border-t flex items-center gap-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No issues detected
          </span>
        </div>
      )}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function ValidationPanel({ data }: { data: ValidationResponse }) {
  const { alignment } = data;
  const missingAssays = Object.entries(alignment.missing_per_assay);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary banner */}
      <div
        className="rounded-xl border p-4 flex items-start gap-4"
        style={{
          background: data.overall_passed
            ? "rgba(16,185,129,0.07)"
            : "rgba(239,68,68,0.07)",
          borderColor: data.overall_passed
            ? "rgba(16,185,129,0.3)"
            : "rgba(239,68,68,0.3)",
        }}
      >
        {data.overall_passed ? (
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
        ) : (
          <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "var(--error)" }} />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {data.overall_passed ? "Validation Passed" : "Validation Failed"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {data.summary}
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {data.error_count > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--error)" }}>{data.error_count}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Errors</p>
            </div>
          )}
          {data.warning_count > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--warning)" }}>{data.warning_count}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Warnings</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: "var(--success)" }}>
              {alignment.total_aligned}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aligned</p>
          </div>
        </div>
      </div>

      {/* Alignment summary */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Cross-Assay Sample Alignment
          </h4>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${alignment.total_aligned > 0 ? 100 : 0}%`,
                background: alignment.total_aligned > 0 ? "var(--success)" : "var(--error)",
              }}
            />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {alignment.total_aligned} sample(s) fully aligned
          </span>
        </div>
        {missingAssays.length > 0 && (
          <div className="space-y-1.5">
            {missingAssays.map(([assay, ids]) => (
              <div key={assay} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-medium">{assay}</span> missing {ids.length} sample(s):{" "}
                  {ids.slice(0, 3).join(", ")}{ids.length > 3 ? ` +${ids.length - 3} more` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-assay cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Per-Assay Results
          </h4>
        </div>
        <div className="space-y-2.5">
          {Object.values(data.assay_results).map((result) => (
            <AssayCard key={result.assay_name} result={result} />
          ))}
        </div>
      </div>
    </div>
  );
}
