"use client";
import { Download, FileText, CheckCircle2, AlertTriangle, FlaskConical, BookOpen } from "lucide-react";
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
        refs.forEach(f => lines.push(`  • [${f.id}] ${f.title}`));
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
        const rhoStr = fc.rho !== null ? ` (ρ=${fc.rho >= 0 ? "+" : ""}${fc.rho.toFixed(3)}, p=${fc.p_value?.toFixed(4)})` : "";
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
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <FileText className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                {summary.title}
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Based on {approvedFindings.length} approved finding{approvedFindings.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadReport(summary, approvedFindings)}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-500/10"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            <Download className="h-3.5 w-3.5" />
            Download Report
          </button>
        </div>
      </div>

      {/* Executive summary */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "rgba(59,130,246,0.04)", borderColor: "rgba(59,130,246,0.2)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Executive Summary</h3>
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
              className="rounded-xl border p-5 space-y-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
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
                      className="rounded-md border px-2.5 py-1 text-[11px] font-medium"
                      style={{ borderColor: "rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.06)", color: "#4ade80" }}
                    >
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      {f.title.length > 50 ? f.title.slice(0, 50) + "…" : f.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key conclusions */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-4 w-4" style={{ color: "#4ade80" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Key Conclusions</h3>
        </div>
        <ol className="space-y-2.5">
          {summary.conclusions.map((c, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{c}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Limitations + methodology */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-xl border p-4"
          style={{ background: "rgba(234,179,8,0.04)", borderColor: "rgba(234,179,8,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#facc15" }} />
            <h4 className="text-xs font-semibold" style={{ color: "#facc15" }}>Limitations</h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {summary.limitations}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <h4 className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Methodology Note</h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {summary.methodology_note}
          </p>
        </div>
      </div>
    </div>
  );
}
