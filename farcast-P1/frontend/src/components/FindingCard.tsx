"use client";
import { useState } from "react";
import { CircleCheck as CheckCircle2, Circle as XCircle, ChevronDown, ChevronRight, Microscope, TestTube as TestTube2, Save as Waves, Dna, ClipboardList, BookOpen, TrendingUp, TrendingDown, Minus, Shield, Zap, CircleAlert as AlertCircle, ChartBar as BarChart2 } from "lucide-react";
import clsx from "clsx";
import { AnalysisFinding } from "@/lib/api";

const ASSAY_CONFIG: Record<string, { icon: React.ElementType; color: string; light: string }> = {
  histopathology: { icon: Microscope, color: "var(--histopathology)", light: "var(--histopathology-light)" },
  cytokine: { icon: TestTube2, color: "var(--cytokine)", light: "var(--cytokine-light)" },
  flow_cytometry: { icon: Waves, color: "var(--flow-cytometry)", light: "var(--flow-cytometry-light)" },
  nanostring: { icon: Dna, color: "var(--nanostring)", light: "var(--nanostring-light)" },
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  immune_effector:    { bg: "var(--success-bg)", text: "var(--success)", border: "var(--success-light)" },
  cytokine_signature: { bg: "rgba(219,181,106,0.12)", text: "#c9a355", border: "rgba(219,181,106,0.3)" },
  gene_expression:    { bg: "rgba(181,168,196,0.12)", text: "var(--histopathology)", border: "rgba(181,168,196,0.3)" },
  immune_suppression: { bg: "var(--error-bg)", text: "var(--error)", border: "var(--error-light)" },
  immune_exclusion:   { bg: "var(--warning-bg)", text: "var(--warning)", border: "var(--warning-light)" },
  other:              { bg: "var(--background-alt)", text: "var(--text-muted)", border: "var(--border)" },
};

const CATEGORY_LABELS: Record<string, string> = {
  immune_effector: "Immune Effector",
  cytokine_signature: "Cytokine Signature",
  gene_expression: "Gene Expression",
  immune_suppression: "Immune Suppression",
  immune_exclusion: "Immune Exclusion",
  other: "Other",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  immune_effector: Zap,
  cytokine_signature: BarChart2,
  gene_expression: Dna,
  immune_suppression: Shield,
  immune_exclusion: AlertCircle,
  other: ClipboardList,
};

const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: "var(--success-bg)", color: "var(--success)", label: "High" },
  medium: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Medium" },
  low:    { bg: "var(--error-bg)", color: "var(--error)", label: "Low" },
};

interface Props {
  finding: AnalysisFinding;
  index: number;
  approved: boolean | null;
  onApprove: () => void;
  onReject: () => void;
}

export default function FindingCard({ finding, index, approved, onApprove, onReject }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);

  const assayConfig = ASSAY_CONFIG[finding.assay] || { icon: ClipboardList, color: "var(--accent)", light: "var(--accent-light)" };
  const AssayIcon = assayConfig.icon;
  const catStyle = CATEGORY_STYLES[finding.category] ?? CATEGORY_STYLES.other;
  const CatIcon = CATEGORY_ICONS[finding.category] ?? ClipboardList;
  const confStyle = CONFIDENCE_STYLE[finding.confidence] ?? CONFIDENCE_STYLE.medium;

  const borderColor = approved === true
    ? "var(--success-light)"
    : approved === false
    ? "var(--error-light)"
    : "var(--border)";

  const cardBg = approved === true
    ? "var(--success-bg)"
    : approved === false
    ? "var(--error-bg)"
    : "var(--surface)";

  return (
    <div
      className="card-premium transition-all duration-200"
      style={{ background: cardBg, borderColor }}
    >
      {/* Header row */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Index badge */}
          <div
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
            style={{ background: assayConfig.light, color: assayConfig.color }}
          >
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + meta chips */}
            <p className="text-sm font-semibold leading-snug mb-2" style={{ color: "var(--text-primary)" }}>
              {finding.title}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {/* Assay chip */}
              <span
                className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium"
                style={{ background: assayConfig.light, color: assayConfig.color }}
              >
                <AssayIcon className="h-3.5 w-3.5" />
                {finding.assay.replace("_", " ")}
              </span>

              {/* Category chip */}
              <span
                className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium"
                style={{ background: catStyle.bg, color: catStyle.text }}
              >
                <CatIcon className="h-3.5 w-3.5" />
                {CATEGORY_LABELS[finding.category] ?? finding.category}
              </span>

              {/* Confidence */}
              <span
                className="rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ background: confStyle.bg, color: confStyle.color }}
              >
                {confStyle.label} confidence
              </span>

              {/* Feature count */}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {finding.features_cited.length} feature{finding.features_cited.length !== 1 ? "s" : ""} cited
              </span>
            </div>
          </div>

          {/* Approve / Reject buttons */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={onApprove}
              title="Approve finding"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border-2 transition-all"
              style={
                approved === true
                  ? { background: "var(--success-light)", borderColor: "var(--success)", color: "var(--success)" }
                  : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              {approved === true ? "Approved" : "Approve"}
            </button>
            <button
              onClick={onReject}
              title="Reject finding"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border-2 transition-all"
              style={
                approved === false
                  ? { background: "var(--error-light)", borderColor: "var(--error)", color: "var(--error)" }
                  : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              <XCircle className="h-4 w-4" />
              {approved === false ? "Rejected" : "Reject"}
            </button>
          </div>
        </div>
      </div>

      {/* Feature evidence */}
      {finding.features_cited.length > 0 && (
        <div className="px-5 pb-5">
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--background-alt)" }}>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: "var(--text-muted)" }}>Feature</th>
                  <th className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--text-muted)" }}>p (Spearman)</th>
                  <th className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--text-muted)" }}>p-value</th>
                  <th className="px-4 py-2.5 text-center font-semibold" style={{ color: "var(--text-muted)" }}>Direction</th>
                </tr>
              </thead>
              <tbody>
                {finding.features_cited.slice(0, expanded ? undefined : 4).map((fc, i) => (
                  <tr
                    key={i}
                    style={{
                      borderColor: "var(--border-subtle)",
                      borderTop: "1px solid var(--border-subtle)",
                      background: i % 2 === 0 ? "var(--surface)" : "var(--background)"
                    }}
                  >
                    <td className="px-4 py-2.5 font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                      {fc.name}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-mono font-semibold"
                      style={{
                        color: fc.rho === null ? "var(--text-muted)" :
                          fc.rho > 0 ? "var(--success)" : "var(--error)"
                      }}
                    >
                      {fc.rho !== null ? (fc.rho >= 0 ? "+" : "") + fc.rho.toFixed(3) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {fc.p_value !== null ? fc.p_value.toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {fc.direction === "positive" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                          <TrendingUp className="h-3 w-3" /> pos
                        </span>
                      ) : fc.direction === "negative" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--error-bg)", color: "var(--error)" }}>
                          <TrendingDown className="h-3 w-3" /> neg
                        </span>
                      ) : (
                        <span className="inline-flex items-center" style={{ color: "var(--text-muted)" }}>
                          <Minus className="h-3 w-3" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {finding.features_cited.length > 4 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-1.5"
              style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {expanded ? "Show fewer features" : `Show all ${finding.features_cited.length} features`}
            </button>
          )}
        </div>
      )}

      {/* Interpretation + clinical implication */}
      <div
        className="border-t px-5 py-5 space-y-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
            Biological Interpretation
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {finding.interpretation}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
            Clinical Implication
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {finding.clinical_implication}
          </p>
        </div>

        {/* Confidence rationale */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: confStyle.bg, border: `1px solid ${confStyle.color}40` }}
        >
          <p className="text-sm" style={{ color: confStyle.color }}>
            <span className="font-semibold">Confidence - {finding.confidence}: </span>
            {finding.confidence_rationale}
          </p>
        </div>

        {/* Research references */}
        {finding.research_refs.length > 0 && (
          <div>
            <button
              onClick={() => setRefsOpen(!refsOpen)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--accent)", background: "var(--accent-bg)" }}
            >
              <BookOpen className="h-4 w-4" />
              {refsOpen ? "Hide" : "Show"} {finding.research_refs.length} reference{finding.research_refs.length !== 1 ? "s" : ""}
              {refsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {refsOpen && (
              <div className="mt-3 space-y-2">
                {finding.research_refs.map((ref, i) => (
                  <div
                    key={i}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "var(--accent-light)", background: "var(--accent-bg)" }}
                  >
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                      {ref.citation}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {ref.relevance}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
