"use client";
import { Download, FileText, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, FlaskConical, BookOpen } from "lucide-react";
import { SummaryResponse, AnalysisFinding } from "@/lib/api";

interface Props {
  summary: SummaryResponse;
  approvedFindings: AnalysisFinding[];
}

function downloadReport(summary: SummaryResponse, findings: AnalysisFinding[]) {
  const lines: string[] = [];
  lines.push(summary.title);
  lines.push("=".repeat(summary.title.length));
  lines.push("");
  lines.push("EXECUTIVE SUMMARY");
  lines.push("-".repeat(40));
  lines.push(summary.executive_summary);
  lines.push("");

  for (const section of summary.sections) {
    lines.push(section.heading.toUpperCase());
    lines.push("-".repeat(40));
    lines.push(section.content);
    if (section.finding_ids.length > 0) {
      const refs = findings.filter(f => section.finding_ids.includes(f.id));
      if (refs.length > 0) {
        lines.push("");
        lines.push("Supporting findings:");
        refs.forEach(f => lines.push(`  * [${f.id}] ${f.title}`));
      }
    }
    lines.push("");
  }

  lines.push("KEY CONCLUSIONS");
  lines.push("-".repeat(40));
  summary.conclusions.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  lines.push("");

  lines.push("LIMITATIONS");
  lines.push("-".repeat(40));
  lines.push(summary.limitations);
  lines.push("");

  lines.push("METHODOLOGY NOTE");
  lines.push("-".repeat(40));
  lines.push(summary.methodology_note);
  lines.push("");

  lines.push("APPROVED FINDINGS DETAIL");
  lines.push("-".repeat(40));
  findings.forEach(f => {
    lines.push(`[${f.id}] ${f.title}`);
    lines.push(`  Assay: ${f.assay} | Category: ${f.category} | Confidence: ${f.confidence}`);
    lines.push(`  Interpretation: ${f.interpretation}`);
    lines.push(`  Clinical implication: ${f.clinical_implication}`);
    if (f.features_cited.length > 0) {
      lines.push("  Key features:");
      f.features_cited.slice(0, 5).forEach(fc => {
        const rhoStr = fc.rho !== null ? ` (p=${fc.rho >= 0 ? "+" : ""}${fc.rho.toFixed(3)}, p=${fc.p_value?.toFixed(4)})` : "";
        lines.push(`    - ${fc.name}${rhoStr}`);
      });
    }
    if (f.research_refs.length > 0) {
      lines.push("  References:");
      f.research_refs.forEach(r => lines.push(`    - ${r.citation}`));
    }
    lines.push("");
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "farcast_time_analysis_report.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export default function SummaryPanel({ summary, approvedFindings }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card-premium p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-bg)" }}
            >
              <FileText className="h-6 w-6" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                {summary.title}
              </h2>
              <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
                Based on {approvedFindings.length} approved finding{approvedFindings.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadReport(summary, approvedFindings)}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
            style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-bg)", border: "2px solid var(--accent)" }}
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* Executive summary */}
      <div
        className="card-premium p-6"
        style={{ background: "var(--accent-bg)", borderColor: "var(--accent-light)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-light)" }}
          >
            <FlaskConical className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Executive Summary
          </h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {summary.executive_summary}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {summary.sections.map((section, i) => {
          const sectionFindings = approvedFindings.filter(f => section.finding_ids.includes(f.id));
          return (
            <div
              key={i}
              className="card-premium p-5 space-y-4"
            >
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                {section.heading}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {section.content}
              </p>
              {sectionFindings.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {sectionFindings.map(f => (
                    <span
                      key={f.id}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5"
                      style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-light)" }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {f.title.length > 50 ? f.title.slice(0, 50) + "..." : f.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key conclusions */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--success-bg)" }}
          >
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
            Key Conclusions
          </h3>
        </div>
        <ol className="space-y-4">
          {summary.conclusions.map((c, i) => (
            <li key={i} className="flex items-start gap-4">
              <span
                className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed pt-1" style={{ color: "var(--text-secondary)" }}>{c}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Limitations + methodology */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="card-premium p-5"
          style={{ background: "var(--warning-bg)", borderColor: "var(--warning-light)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--warning-light)" }}
            >
              <AlertTriangle className="h-4 w-4" style={{ color: "var(--warning)" }} />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--warning)" }}>
              Limitations
            </h4>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {summary.limitations}
          </p>
        </div>
        <div
          className="card-premium p-5"
          style={{ background: "var(--accent-bg)", borderColor: "var(--accent-light)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--accent-light)" }}
            >
              <BookOpen className="h-4 w-4" style={{ color: "var(--accent)" }} />
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
              Methodology Note
            </h4>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {summary.methodology_note}
          </p>
        </div>
      </div>
    </div>
  );
}
