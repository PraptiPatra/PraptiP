"use client";
import { useState } from "react";
import { Activity, ChevronRight, Loader as Loader2, CircleCheck as CheckCircle2, Circle as XCircle, FlaskConical, Microscope, TestTube as TestTube2, Save as Waves, Dna, ClipboardList, Brain } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ArmsMapper from "@/components/ArmsMapper";
import ValidationPanel from "@/components/ValidationPanel";
import OutputPanel from "@/components/OutputPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import {
  validateFile, DEFAULT_ARMS_CONFIG, ValidationResponse, ArmsConfig,
} from "@/lib/api";

type Step = "upload" | "validating" | "results" | "analysis";

const BREADCRUMB_LABELS: Record<Step, string> = {
  upload: "Configure",
  validating: "Processing",
  results: "Results",
  analysis: "Analysis",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [armsConfig, setArmsConfig] = useState<ArmsConfig>(DEFAULT_ARMS_CONFIG);
  const [useFeatureSelection, setUseFeatureSelection] = useState(true);
  const [step, setStep] = useState<Step>("upload");
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"validation" | "output">("validation");

  const handleRun = async () => {
    if (!file) return;
    setStep("validating");
    setError(null);
    setResult(null);
    try {
      const res = await validateFile(file, armsConfig, useFeatureSelection);
      setResult(res);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setStep("upload");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setStep("upload");
  };

  const isAnalysisStep = step === "analysis";
  const BREADCRUMB_STEPS: Step[] = ["upload", "validating", "results", "analysis"];

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "var(--background)" }}>
      {/* ── Topbar ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b glass"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
            style={{ background: "var(--accent-bg)" }}
          >
            <Activity className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Farcast TiME
            </span>
            <span className="ml-3 text-sm badge badge-accent" >
              Assay Validation &amp; LLM Analysis
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {BREADCRUMB_STEPS.filter(s => s !== "validating").map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--text-faint)" }} />}
              <span
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  color: step === s ? "var(--accent)" : "var(--text-muted)",
                  background: step === s ? "var(--accent-bg)" : "transparent"
                }}
              >
                {BREADCRUMB_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 max-w-[1440px] mx-auto w-full relative z-10">
        {/* ── Left panel: configure ── */}
        <aside
          className="w-full lg:w-[440px] flex-shrink-0 border-r p-8 space-y-7"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Data Validator
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Upload your multi-assay Excel database. The engine validates schema, values, and cross-assay alignment, then outputs LLM-ready structured data.
            </p>
          </div>

          {/* Assay legend */}
          <div className="card-premium p-5">
            <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Expected Assay Sheets
            </p>
            <div className="space-y-3">
              {[
                { Icon: Microscope, name: "H&E and IHC_n=16", label: "Histopathology", color: "var(--histopathology)" },
                { Icon: TestTube2,  name: "Cytokine_n=16",    label: "Cytokine Panel", color: "var(--cytokine)" },
                { Icon: Waves,      name: "Flowcytometry_n=16", label: "Flow Cytometry", color: "var(--flow-cytometry)" },
                { Icon: Dna,        name: "NanoString_n=16",  label: "NanoString GEx", color: "var(--nanostring)" },
                { Icon: ClipboardList, name: "Assay details", label: "Metadata (optional)", color: "var(--text-muted)" },
              ].map((a) => (
                <div key={a.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${a.color}15` }}
                  >
                    <a.Icon className="h-4 w-4" style={{ color: a.color }} />
                  </div>
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.label}</span>
                    <span className="text-[11px] ml-2 font-mono" style={{ color: "var(--text-muted)" }}>{a.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File upload */}
          <FileUpload
            file={file}
            onChange={setFile}
            disabled={step === "validating" || isAnalysisStep}
          />

          {/* Arms mapper */}
          <ArmsMapper
            config={armsConfig}
            onChange={setArmsConfig}
            useFeatureSelection={useFeatureSelection}
            onFeatureSelectionChange={setUseFeatureSelection}
            disabled={step === "validating" || isAnalysisStep}
          />

          {/* Error */}
          {error && (
            <div
              className="rounded-xl border p-4 flex items-start gap-3 animate-fade-in"
              style={{ background: "var(--error-bg)", borderColor: "var(--error-light)" }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: "var(--error-light)" }}>
                <XCircle className="h-4 w-4" style={{ color: "var(--error)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--error)" }}>Validation Error</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{error}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <button
                onClick={handleRun}
                disabled={!file || step === "validating" || isAnalysisStep}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === "validating" ? (
                  <>
                    <Loader2 className="h-4 w-4 spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4" />
                    Run Validation
                  </>
                )}
              </button>
              {(step === "results" || isAnalysisStep) && (
                <button
                  onClick={handleReset}
                  className="rounded-xl px-5 py-3.5 text-sm font-medium btn-secondary"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Run Analysis button */}
            {step === "results" && result?.clean_data && (
              <button
                onClick={() => setStep("analysis")}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold border transition-all hover:shadow-md animate-fade-in"
                style={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                  background: "var(--accent-bg)"
                }}
              >
                <Brain className="h-4 w-4" />
                Run LLM Analysis
                <span
                  className="ml-1 rounded-lg px-2 py-0.5 text-[10px] font-mono"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  claude-opus-4-8
                </span>
              </button>
            )}
          </div>
        </aside>

        {/* ── Right panel: results / analysis ── */}
        <section className="flex-1 flex flex-col min-w-0">
          {step === "upload" && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-2xl mb-6 animate-float"
                style={{ background: "var(--accent-bg)", boxShadow: "0 8px 32px rgba(124, 158, 178, 0.15)" }}
              >
                <Activity className="h-10 w-10" style={{ color: "var(--accent)" }} />
              </div>
              <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                Ready to Validate
              </h2>
              <p className="text-sm max-w-md leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Upload your Farcast TiME Excel database on the left, configure arms, then click{" "}
                <span className="font-semibold" style={{ color: "var(--accent)" }}>Run Validation</span>
              </p>
              <div className="mt-6 flex gap-2">
                {[".xlsx", "Schema validation", "Cross-assay alignment"].map((item, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step === "validating" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 animate-fade-in">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full" style={{ background: "var(--accent-bg)" }} />
                <div className="absolute inset-2 rounded-full animate-pulse-soft" style={{ background: "var(--accent-light)" }} />
                <Loader2 className="h-8 w-8 spin relative" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Validating assay data...
                </p>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                  Checking schemas, values, and cross-assay alignment
                </p>
              </div>
              <div className="space-y-3 w-72">
                {["Schema validation", "Value checks", "Sample alignment", "Formatting output"].map((s, i) => (
                  <div key={s} className="flex items-center gap-3 p-2 px-3 rounded-lg" style={{ background: "var(--surface)" }}>
                    <div className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "results" && result && (
            <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {/* ── LLM Analysis CTA banner ── */}
              {result.clean_data && (
                <div
                  className="mx-6 mt-6 rounded-2xl border px-6 py-5 flex items-center justify-between gap-4 card-premium"
                  style={{ background: "var(--accent-bg)", borderColor: "var(--accent-light)" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: "var(--accent-light)" }}
                    >
                      <Brain className="h-5 w-5" style={{ color: "var(--accent)" }} />
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                        Ready for LLM Analysis
                      </p>
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        Run Sarvam-M to extract immunological findings with research citations
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep("analysis")}
                    className="flex-shrink-0 flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold btn-primary"
                  >
                    <Brain className="h-4 w-4" />
                    Run Analysis
                  </button>
                </div>
              )}

              {/* Tab bar */}
              <div className="flex gap-2 px-6 pt-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {(["validation", "output"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-5 py-3 text-sm font-medium rounded-t-xl transition-all relative"
                    style={{
                      color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
                      background: activeTab === tab ? "var(--surface)" : "transparent",
                    }}
                  >
                    {tab === "validation" ? (
                      <span className="flex items-center gap-2">
                        {result.overall_passed ? (
                          <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
                        ) : (
                          <XCircle className="h-4 w-4" style={{ color: "var(--error)" }} />
                        )}
                        Validation Report
                        {result.error_count > 0 && (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--error-bg)", color: "var(--error)" }}>
                            {result.error_count}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4" />
                        Clean Output
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                          {result.alignment.total_aligned}
                        </span>
                      </span>
                    )}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "var(--accent)" }} />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "validation" && <ValidationPanel data={result} />}
                {activeTab === "output" && result.clean_data && (
                  <OutputPanel cleanData={result.clean_data} />
                )}
                {activeTab === "output" && !result.clean_data && (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No clean output available — resolve errors first.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "analysis" && result?.clean_data && (
            <AnalysisPanel
              cleanData={result.clean_data}
              armsConfig={result.arms_config}
              onBack={() => setStep("results")}
            />
          )}
        </section>
      </main>
    </div>
  );
}
