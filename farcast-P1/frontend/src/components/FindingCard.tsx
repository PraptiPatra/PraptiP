"use client";
import { useState } from "react";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Microscope, TestTube2, Waves, Dna, ClipboardList,
  BookOpen, TrendingUp, TrendingDown, Minus, Shield, Zap,
  AlertCircle, BarChart2,
} from "lucide-react";
import clsx from "clsx";
import { AnalysisFinding } from "@/lib/api";

const ASSAY_ICONS: Record<string, React.ElementType> = {
  histopathology: Microscope,
  cytokine: TestTube2,
  flow_cytometry: Waves,
  nanostring: Dna,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  immune_effector:    { bg: "rgba(34,197,94,0.1)",  text: "#4ade80", border: "rgba(34,197,94,0.3)" },
  cytokine_signature: { bg: "rgba(249,115,22,0.1)", text: "#fb923c", border: "rgba(249,115,22,0.3)" },
  gene_expression:    { bg: "rgba(168,85,247,0.1)", text: "#c084fc", border: "rgba(168,85,247,0.3)" },
  immune_suppression: { bg: "rgba(239,68,68,0.1)",  text: "#f87171", border: "rgba(239,68,68,0.3)" },
  immune_exclusion:   { bg: "rgba(234,179,8,0.1)",  text: "#facc15", border: "rgba(234,179,8,0.3)" },
  other:              { bg: "rgba(100,116,139,0.1)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
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

const CONFIDENCE_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: "#4ade80", label: "High confidence" },
  medium: { color: "#facc15", label: "Medium confidence" },
  low:    { color: "#f87171", label: "Low confidence" },
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

  const AssayIcon = ASSAY_ICONS[finding.assay] ?? ClipboardList;
  const catStyle = CATEGORY_COLORS[finding.category] ?? CATEGORY_COLORS.other;
  const CatIcon = CATEGORY_ICONS[finding.category] ?? ClipboardList;
  const confStyle = CONFIDENCE_STYLE[finding.confidence] ?? CONFIDENCE_STYLE.medium;

  const borderColor = approved === true
    ? "rgba(74,222,128,0.4)"
    : approved === false
    ? "rgba(239,68,68,0.3)"
    : "var(--border)";

  const cardBg = approved === true
    ? "rgba(34,197,94,0.04)"
    : approved === false
    ? "rgba(239,68,68,0.04)"
    : "var(--surface)";

  return (
    <div
      className="rounded-xl border transition-all duration-200"
      style={{ background: cardBg, borderColor }}
    >
      {/* Header row */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Index badge */}
          <div
            className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
          >
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + meta chips */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                {finding.title}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Assay chip */}
              <span
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--background)" }}
              >
                <AssayIcon className="h-3 w-3" />
                {finding.assay.replace("_", " ")}
              </span>

              {/* Category chip */}
              <span
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
              >
                <CatIcon className="h-3 w-3" />
                {CATEGORY_LABELS[finding.category] ?? finding.category}
              </span>

              {/* Confidence */}
              <span className="text-[10px] font-medium" style={{ color: confStyle.color }}>
                ● {confStyle.label}
              </span>

              {/* Feature count */}
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {finding.features_cited.length} feature{finding.features_cited.length !== 1 ? "s" : ""} cited
              </span>
            </div>
          </div>

          {/* Approve / Reject buttons */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={onApprove}
              title="Approve finding"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all"
              style={
                approved === true
                  ? { background: "rgba(34,197,94,0.2)", borderColor: "#4ade80", color: "#4ade80" }
                  : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={onReject}
              title="Reject finding"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all"
              style={
                approved === false
                  ? { background: "rgba(239,68,68,0.15)", borderColor: "#f87171", color: "#f87171" }
                  : { background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* Feature evidence — always visible (top 4 features) */}
      {finding.features_cited.length > 0 && (
        <div className="px-4 pb-3">
          <div
            className="rounded-lg overflow-hidden border"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: "var(--surface-raised)" }}>
                  <th className="px-3 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)" }}>Feature</th>
                  <th className="px-3 py-1.5 text-right font-medium" style={{ color: "var(--text-muted)" }}>ρ (Spearman)</th>
                  <th className="px-3 py-1.5 text-right font-medium" style={{ color: "var(--text-muted)" }}>p-value</th>
                  <th className="px-3 py-1.5 text-center font-medium" style={{ color: "var(--text-muted)" }}>Direction</th>
                </tr>
              </thead>
              <tbody>
                {finding.features_cited.slice(0, expanded ? undefined : 4).map((fc, i) => (
                  <tr
                    key={i}
                    className="border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td className="px-3 py-1.5 font-mono" style={{ color: "var(--text-primary)" }}>
                      {fc.name}
                    </td>
                    <td
                      className="px-3 py-1.5 text-right font-mono font-medium"
                      style={{
                        color: fc.rho === null ? "var(--text-muted)" :
                          fc.rho > 0 ? "#4ade80" : "#f87171"
                      }}
                    >
                      {fc.rho !== null ? (fc.rho >= 0 ? "+" : "") + fc.rho.toFixed(3) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                      {fc.p_value !== null ? fc.p_value.toFixed(4) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {fc.direction === "positive" ? (
                        <span className="inline-flex items-center gap-0.5" style={{ color: "#4ade80" }}>
                          <TrendingUp className="h-3 w-3" /> pos
                        </span>
                      ) : fc.direction === "negative" ? (
                        <span className="inline-flex items-center gap-0.5" style={{ color: "#f87171" }}>
                          <TrendingDown className="h-3 w-3" /> neg
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}><Minus className="h-3 w-3 inline" /></span>
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
              className="mt-1.5 flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Show fewer features" : `Show all ${finding.features_cited.length} features`}
            </button>
          )}
        </div>
      )}

      {/* Interpretation + clinical implication — expandable */}
      <div
        className="border-t px-4 py-3 space-y-2.5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div>
          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
            Biological Interpretation
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {finding.interpretation}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
            Clinical Implication
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {finding.clinical_implication}
          </p>
        </div>

        {/* Confidence rationale */}
        <div
          className="rounded-lg px-3 py-2"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[11px]" style={{ color: confStyle.color }}>
            <span className="font-medium">Confidence — {finding.confidence}: </span>
            {finding.confidence_rationale}
          </p>
        </div>

        {/* Research references */}
        {finding.research_refs.length > 0 && (
          <div>
            <button
              onClick={() => setRefsOpen(!refsOpen)}
              className="flex items-center gap-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              {refsOpen ? "Hide" : "Show"} {finding.research_refs.length} research reference{finding.research_refs.length !== 1 ? "s" : ""}
              {refsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {refsOpen && (
              <div className="mt-2 space-y-2">
                {finding.research_refs.map((ref, i) => (
                  <div
                    key={i}
                    className="rounded-lg border px-3 py-2 space-y-0.5"
                    style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}
                  >
                    <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                      {ref.citation}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
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
