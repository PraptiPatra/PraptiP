"use client";
import { useState, useCallback } from "react";
import { Brain, Loader as Loader2, ChevronLeft, CircleCheck as CheckCircle2, Circle as XCircle, Layers, MessageSquare, Sparkles, ArrowRight, CircleAlert as AlertCircle } from "lucide-react";
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
    <div className="space-y-3 w-80">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: i <= current ? "var(--surface)" : "transparent" }}>
          {i < current ? (
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "var(--success-bg)" }}>
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
            </div>
          ) : i === current ? (
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "var(--accent-bg)" }}>
              <Loader2 className="h-3.5 w-3.5 spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : (
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-2 w-2 rounded-full" style={{ background: "var(--text-faint)" }} />
            </div>
          )}
          <span
            className="text-sm"
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
        <div className="flex items-center gap-3 px-6 py-4 border-b glass" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--background-alt)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Results
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-12 animate-fade-in">
          {error ? (
            <div className="space-y-5 text-center max-w-md">
              <div
                className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl"
                style={{ background: "var(--error-bg)" }}
              >
                <AlertCircle className="h-9 w-9" style={{ color: "var(--error)" }} />
              </div>
              <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Analysis failed</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--error)" }}>{error}</p>
              <button
                onClick={startAnalysis}
                className="btn-primary px-6 py-3"
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl" style={{ background: "var(--accent-bg)" }} />
                <div className="absolute inset-2 rounded-xl animate-pulse-soft" style={{ background: "var(--accent-light)" }} />
                <Brain className="h-10 w-10 relative" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Analyzing with Claude claude-opus-4-8...
                </p>
                <p className="text-sm mt-2 leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
                  Sarvam-M identifying immunological patterns and generating research-backed findings
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
        <div className="flex items-center gap-3 px-6 py-4 border-b glass" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            onClick={() => setStep("review")}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--background-alt)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Review
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-12 animate-fade-in">
          {error ? (
            <div className="space-y-5 text-center max-w-md">
              <div
                className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl"
                style={{ background: "var(--error-bg)" }}
              >
                <AlertCircle className="h-8 w-8" style={{ color: "var(--error)" }} />
              </div>
              <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Summary generation failed</p>
              <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
              <button
                onClick={handleGenerateSummary}
                className="btn-primary px-6 py-3"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl" style={{ background: "var(--accent-bg)" }} />
                <div className="absolute inset-2 rounded-xl animate-pulse-soft" style={{ background: "var(--accent-light)" }} />
                <Sparkles className="h-10 w-10 relative" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Generating clinical summary...
                </p>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
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
        <div className="flex items-center gap-3 px-6 py-4 border-b glass" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            onClick={() => setStep("review")}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--background-alt)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Review
          </button>
          <span className="badge badge-success ml-auto">
            <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
            Report Ready
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
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
          className="flex items-center justify-between px-6 py-4 border-b glass"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", background: "var(--background-alt)" }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Results
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "var(--accent-bg)" }}
            >
              <Brain className="h-4 w-4" style={{ color: "var(--accent)" }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Human Review - {totalCount} Finding{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {approvedCount}/{totalCount} approved
              {pendingCount > 0 && ` - ${pendingCount} pending`}
            </span>
            <button
              onClick={handleApproveAll}
              className="rounded-xl px-4 py-2 text-sm font-medium border-2 transition-colors"
              style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--success-bg)" }}
            >
              Approve All
            </button>
          </div>
        </div>

        {/* Overall interpretation banner */}
        {analysisResult.overall_interpretation && (
          <div
            className="mx-6 mt-5 rounded-2xl border p-5 flex gap-4"
            style={{ background: "var(--accent-bg)", borderColor: "var(--accent-light)" }}
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-light)" }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
                Overall Interpretation
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {analysisResult.overall_interpretation}
              </p>
            </div>
          </div>
        )}

        {/* Cross-assay themes */}
        {analysisResult.cross_assay_themes.length > 0 && (
          <div className="mx-6 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Cross-assay themes
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {analysisResult.cross_assay_themes.map((t, i) => (
                <div
                  key={i}
                  className="card-premium p-4 max-w-sm"
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t.theme}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{t.description}</p>
                  <p className="text-xs mt-2 font-mono" style={{ color: "var(--accent)" }}>
                    {t.supporting_findings.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 mt-3">
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
          className="border-t px-6 py-5 flex items-center justify-between glass"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-4 text-sm">
            <span
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium"
              style={{ color: "var(--success)", background: approvedCount > 0 ? "var(--success-bg)" : "transparent" }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {approvedCount} approved
            </span>
            <span
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium"
              style={{ color: "var(--error)", background: rejectedIds.length > 0 ? "var(--error-bg)" : "transparent" }}
            >
              <XCircle className="h-4 w-4" />
              {rejectedIds.length} rejected
            </span>
            {pendingCount > 0 && (
              <span className="px-3 py-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                {pendingCount} pending review
              </span>
            )}
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={approvedCount === 0}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
