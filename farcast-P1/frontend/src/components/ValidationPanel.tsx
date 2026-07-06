"use client";
import { CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Info, ChevronDown, ChevronRight, Users, FlaskConical, Microscope, TestTube as TestTube2, Save as Waves, Dna, ClipboardList } from "lucide-react";
import { useState } from "react";
import React from "react";
import clsx from "clsx";
import { ValidationResponse, ValidationIssue, AssayValidationResult } from "@/lib/api";

// ── helpers ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  error: {
    icon: XCircle,
    bg: "var(--error-bg)",
    border: "var(--error-light)",
    text: "var(--error)",
    badgeBg: "var(--error-bg)",
    badgeText: "var(--error)",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    bg: "var(--warning-bg)",
    border: "var(--warning-light)",
    text: "var(--warning)",
    badgeBg: "var(--warning-bg)",
    badgeText: "var(--warning)",
    label: "Warning",
  },
  info: {
    icon: Info,
    bg: "var(--info-bg)",
    border: "var(--info-light)",
    text: "var(--info)",
    badgeBg: "var(--info-bg)",
    badgeText: "var(--info)",
    label: "Info",
  },
};

const ASSAY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  histopathology: { icon: Microscope, color: "var(--histopathology)" },
  cytokine: { icon: TestTube2, color: "var(--cytokine)" },
  flow_cytometry: { icon: Waves, color: "var(--flow-cytometry)" },
  nanostring: { icon: Dna, color: "var(--nanostring)" },
};

// ── sub-components ─────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;

  return (
    <div
      className="rounded-xl p-4 space-y-2 border"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: cfg.border }}
        >
          <Icon className="h-4 w-4" style={{ color: cfg.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-mono font-semibold rounded-lg px-2 py-1"
              style={{ background: cfg.badgeBg, color: cfg.badgeText }}
            >
              {issue.code}
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {issue.message}
            </span>
          </div>
          {issue.details && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {issue.details}
            </p>
          )}
          {issue.affected_rows && issue.affected_rows.length > 0 && (
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 mt-2 text-xs font-medium rounded-lg px-2 py-1 transition-colors"
              style={{ color: "var(--text-muted)", background: "var(--surface)" }}
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {issue.affected_rows.length} affected sample(s)
            </button>
          )}
          {open && issue.affected_rows && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {issue.affected_rows.map((id) => (
                <span
                  key={id}
                  className="text-[11px] font-mono rounded-lg px-2.5 py-1"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
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
  const config = ASSAY_CONFIG[result.assay_name] || { icon: ClipboardList, color: "var(--text-muted)" };
  const Icon = config.icon;

  return (
    <div
      className="card-premium overflow-hidden"
      style={{ borderColor: result.passed ? "var(--border)" : "var(--error-light)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
        style={{ background: open ? "var(--surface-hover)" : "var(--surface)" }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${config.color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {result.display_name}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ color: "var(--text-muted)", background: "var(--background-alt)" }}>
              {result.row_count} rows · {result.col_count} cols
            </span>
          </div>
          <div className="flex gap-3 mt-1.5 flex-wrap">
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              TP: {result.timepoints.join(", ")}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              Arms: {result.arms.join(", ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {errors.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--error-bg)", color: "var(--error)" }}>
              <XCircle className="h-3.5 w-3.5" /> {errors.length}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
              <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length}
            </span>
          )}
          {result.passed && errors.length === 0 && (
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Pass
            </span>
          )}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: "var(--background-alt)" }}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            ) : (
              <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            )}
          </div>
        </div>
      </button>

      {open && result.issues.length > 0 && (
        <div
          className="px-5 py-4 space-y-3 border-t"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface)" }}
        >
          {result.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}
      {open && result.issues.length === 0 && (
        <div
          className="px-5 py-4 border-t flex items-center gap-3"
          style={{ borderColor: "var(--border-subtle)", background: "var(--success-bg)" }}
        >
          <CheckCircle2 className="h-5 w-5" style={{ color: "var(--success)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--success)" }}>
            All checks passed
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
    <div className="space-y-6 animate-fade-in">
      {/* Summary banner */}
      <div
        className="card-premium p-6 flex items-start gap-5"
        style={{
          background: data.overall_passed ? "var(--success-bg)" : "var(--error-bg)",
          borderColor: data.overall_passed ? "var(--success-light)" : "var(--error-light)",
        }}
      >
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: data.overall_passed ? "var(--success-light)" : "var(--error-light)" }}
        >
          {data.overall_passed ? (
            <CheckCircle2 className="h-6 w-6" style={{ color: "var(--success)" }} />
          ) : (
            <XCircle className="h-6 w-6" style={{ color: "var(--error)" }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {data.overall_passed ? "Validation Passed" : "Validation Failed"}
          </p>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {data.summary}
          </p>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          {data.error_count > 0 && (
            <div className="text-center p-3 rounded-xl" style={{ background: "var(--error-light)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--error)" }}>{data.error_count}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--error)" }}>Errors</p>
            </div>
          )}
          {data.warning_count > 0 && (
            <div className="text-center p-3 rounded-xl" style={{ background: "var(--warning-light)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--warning)" }}>{data.warning_count}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--warning)" }}>Warnings</p>
            </div>
          )}
          <div className="text-center p-3 rounded-xl" style={{ background: "var(--success-light)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
              {alignment.total_aligned}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--success)" }}>Aligned</p>
          </div>
        </div>
      </div>

      {/* Alignment summary */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-bg)" }}
          >
            <Users className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </div>
          <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Cross-Assay Sample Alignment
          </h4>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${alignment.total_aligned > 0 ? 100 : 0}%`,
                background: alignment.total_aligned > 0 ? "var(--success)" : "var(--error)",
              }}
            />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {alignment.total_aligned} sample(s) fully aligned
          </span>
        </div>
        {missingAssays.length > 0 && (
          <div className="space-y-2 p-4 rounded-xl" style={{ background: "var(--warning-bg)" }}>
            {missingAssays.map(([assay, ids]) => (
              <div key={assay} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-semibold">{assay}</span> missing {ids.length} sample(s):{" "}
                  {ids.slice(0, 3).join(", ")}{ids.length > 3 ? ` +${ids.length - 3} more` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-assay cards */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-bg)" }}
          >
            <FlaskConical className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </div>
          <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Per-Assay Results
          </h4>
        </div>
        <div className="space-y-3">
          {Object.values(data.assay_results).map((result) => (
            <AssayCard key={result.assay_name} result={result} />
          ))}
        </div>
      </div>
    </div>
  );
}
