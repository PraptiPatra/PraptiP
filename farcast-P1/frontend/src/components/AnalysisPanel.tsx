"use client";
import { useState, useCallback } from "react";
import {
  Brain, Loader2, ChevronLeft, CheckCircle2, XCircle,
  Layers, MessageSquare, Sparkles, ArrowRight, AlertCircle,
} from "lucide-react";
import {
  AnalysisResponse, SummaryResponse, CleanAssayData, ArmsConfig,
  runAnalysis, generateSummary, AnalysisFinding,
} from "@/lib/api";
import FindingCard from "./FindingCard";
import SummaryPanel from "./SummaryPanel";

type AnalysisStep = "analyzing" | "review" | "summarizing" | "done";

interface Props {
  cleanData: Record<string, CleanAssayData>;
  armsConfig: ArmsConfig;
  onBack: () => void;
}

const ANALYSIS_STAGES = [
  "Loading assay feature statistics",
  "Building immunological context",
  "Identifying response-correlated patterns",
  "Extracting biological findings",
  "Mapping cross-assay convergence",
  "Generating research citations",
];

const SUMMARY_STAGES = [
  "Synthesizing approved findings",
  "Writing clinical narrative",
  "Structuring key conclusions",
];

function ProgressDots({ stages, current }: { stages: string[]; current: number }) {
  return (
    <div className="space-y-2 w-72">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-2.5">
          {i < current ? (
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--success)" }} />
          ) : i === current ? (
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 spin" style={{ color: "var(--accent)" }} />
          ) : (
            <div className="h-3.5 w-3.5 flex-shrink-0 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--border)" }} />
            </div>
          )}
          <span
            className="text-xs"
            style={{ color: i <= current ? "var(--text-secondary)" : "var(--text-muted)" }}
          >
            {s}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalysisPanel({ cleanData, armsConfig, onBack }: Props) {
  const [step, setStep] = useState<AnalysisStep>("analyzing");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(null);
  const [approvalState, setApprovalState] = useState<Record<string, boolean | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);

  // Auto-start analysis on mount
  const startAnalysis = useCallback(async () => {
    setStep("analyzing");
    setError(null);
    setLoadingStage(0);

    // Animate stages while waiting
    const stageTimer = setInterval(() => {
      setLoadingStage(prev => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
    }, 2200);

    try {
      const result = await runAnalysis(cleanData, armsConfig);
      clearInterval(stageTimer);
      setLoadingStage(ANALYSIS_STAGES.length);

      // Initialize all findings as null (unapproved)
      const initial: Record<string, boolean | null> = {};
      result.findings.forEach(f => { initial[f.id] = null; });
      setApprovalState(initial);
      setAnalysisResult(result);
      setStep("review");
    } catch (e) {
      clearInterval(stageTimer);
      setError(e instanceof Error ? e.message : "Analysis failed");
      setStep("analyzing");
    }
  }, [cleanData, armsConfig]);

  // Run on first render
  const [started, setStarted] = useState(false);
  if (!started) {
    setStarted(true);
    // Use setTimeout to avoid state-during-render issue
    setTimeout(startAnalysis, 0);
  }

  const approvedIds = Object.entries(approvalState)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const rejectedIds = Object.entries(approvalState)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  const pendingCount = Object.values(approvalState).filter(v => v === null).length;

  const handleApproveAll = () => {
    const updated: Record<string, boolean | null> = {};
    analysisResult?.findings.forEach(f => { updated[f.id] = true; });
    setApprovalState(updated);
  };

  const handleGenerateSummary = async () => {
    if (!analysisResult || approvedIds.length === 0) return;
    setStep("summarizing");
    setError(null);
    setLoadingStage(0);

    const stageTimer = setInterval(() => {
      setLoadingStage(prev => (prev < SUMMARY_STAGES.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const result = await generateSummary(
        analysisResult.findings,
        approvedIds,
        analysisResult.overall_interpretation,
        analysisResult.cross_assay_themes,
        armsConfig,
      );
      clearInterval(stageTimer);
      setSummaryResult(result);
      setStep("done");
    } catch (e) {
      clearInterval(stageTimer);
      setError(e instanceof Error ? e.message : "Summary generation failed");
      setStep("review");
    }
  };

  // ── Loading / error state ─────────────────────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Back button header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Results
          </button>
          <span className="text-xs" style={{ color: "var(--border)" }}>|</span>
          <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>LLM Analysis</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
          {error ? (
            <div className="space-y-4 text-center max-w-md">
              <div
                className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <AlertCircle className="h-7 w-7" style={{ color: "var(--error)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Analysis failed</p>
              <p className="text-xs" style={{ color: "#fca5a5" }}>{error}</p>
              <button
                onClick={startAnalysis}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(59,130,246,0.15)" }} />
                <div
                  className="absolute inset-0 rounded-full border-t-2 spin"
                  style={{ borderColor: "var(--accent)", borderRightColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "transparent" }}
                />
                <Brain className="h-8 w-8" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Analyzing with Claude claude-opus-4-8…
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Identifying immunological patterns and generating research-backed findings
                </p>
              </div>
              <ProgressDots stages={ANALYSIS_STAGES} current={loadingStage} />
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Summarizing state ─────────────────────────────────────────────────────
  if (step === "summarizing") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setStep("review")}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Review
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
          {error ? (
            <div className="space-y-4 text-center max-w-md">
              <AlertCircle className="h-10 w-10 mx-auto" style={{ color: "var(--error)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Summary generation failed</p>
              <p className="text-xs" style={{ color: "#fca5a5" }}>{error}</p>
              <button
                onClick={handleGenerateSummary}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "rgba(59,130,246,0.15)" }} />
                <div
                  className="absolute inset-0 rounded-full border-t-2 spin"
                  style={{ borderColor: "var(--accent)", borderRightColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "transparent" }}
                />
                <Sparkles className="h-8 w-8" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Generating clinical summary…
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Synthesizing {approvedIds.length} approved findings into a structured report
                </p>
              </div>
              <ProgressDots stages={SUMMARY_STAGES} current={loadingStage} />
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Summary done state ────────────────────────────────────────────────────
  if (step === "done" && summaryResult && analysisResult) {
    const approved = analysisResult.findings.filter(f => approvedIds.includes(f.id));
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setStep("review")}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Review
          </button>
          <span className="text-xs" style={{ color: "var(--border)" }}>|</span>
          <span className="text-xs font-semibold" style={{ color: "#4ade80" }}>
            <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
            Report Ready
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <SummaryPanel summary={summaryResult} approvedFindings={approved} />
        </div>
      </div>
    );
  }

  // ── Review state ──────────────────────────────────────────────────────────
  if (step === "review" && analysisResult) {
    const approvedCount = approvedIds.length;
    const totalCount = analysisResult.findings.length;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header + controls */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Results
            </button>
            <span className="text-xs" style={{ color: "var(--border)" }}>|</span>
            <Brain className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              Human Review — {totalCount} Finding{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {approvedCount}/{totalCount} approved
              {pendingCount > 0 && ` · ${pendingCount} pending`}
            </span>
            <button
              onClick={handleApproveAll}
              className="rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Approve All
            </button>
          </div>
        </div>

        {/* Overall interpretation banner */}
        {analysisResult.overall_interpretation && (
          <div
            className="mx-6 mt-4 rounded-xl border px-4 py-3 flex gap-3"
            style={{ background: "rgba(59,130,246,0.04)", borderColor: "rgba(59,130,246,0.2)" }}
          >
            <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <span className="font-semibold" style={{ color: "var(--accent)" }}>Overall: </span>
              {analysisResult.overall_interpretation}
            </p>
          </div>
        )}

        {/* Cross-assay themes */}
        {analysisResult.cross_assay_themes.length > 0 && (
          <div className="mx-6 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Cross-assay themes
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisResult.cross_assay_themes.map((t, i) => (
                <div
                  key={i}
                  className="rounded-lg border px-3 py-2 max-w-xs"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{t.theme}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{t.description}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--accent)" }}>
                    {t.supporting_findings.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 mt-2">
          {analysisResult.findings.map((finding, i) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              index={i}
              approved={approvalState[finding.id] ?? null}
              onApprove={() => setApprovalState(prev => ({ ...prev, [finding.id]: true }))}
              onReject={() => setApprovalState(prev => ({ ...prev, [finding.id]: false }))}
            />
          ))}
        </div>

        {/* Sticky footer action bar */}
        <div
          className="border-t px-6 py-4 flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <span
              className="flex items-center gap-1.5"
              style={{ color: approvedCount > 0 ? "#4ade80" : "var(--text-muted)" }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {approvedCount} approved
            </span>
            <span
              className="flex items-center gap-1.5"
              style={{ color: rejectedIds.length > 0 ? "#f87171" : "var(--text-muted)" }}
            >
              <XCircle className="h-3.5 w-3.5" />
              {rejectedIds.length} rejected
            </span>
            {pendingCount > 0 && (
              <span>{pendingCount} pending review</span>
            )}
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={approvedCount === 0}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Sparkles className="h-4 w-4" />
            Generate Summary
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
