"use client";
import { useState } from "react";
import {
  Activity, ChevronRight, Loader2,
  CheckCircle2, XCircle, FlaskConical,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ArmsMapper from "@/components/ArmsMapper";
import ValidationPanel from "@/components/ValidationPanel";
import OutputPanel from "@/components/OutputPanel";
import {
  validateFile, DEFAULT_ARMS_CONFIG, ValidationResponse, ArmsConfig,
} from "@/lib/api";

type Step = "upload" | "validating" | "results";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [armsConfig, setArmsConfig] = useState<ArmsConfig>(DEFAULT_ARMS_CONFIG);
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
      const res = await validateFile(file, armsConfig);
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* ── Topbar ── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: "rgba(10,13,20,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "rgba(59,130,246,0.15)" }}
          >
            <Activity className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Farcast TiME
            </span>
            <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Assay Validation Engine · M1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Step breadcrumb */}
          {(["upload", "validating", "results"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3 w-3" style={{ color: "var(--text-muted)" }} />}
              <span
                className="text-xs font-medium"
                style={{ color: step === s ? "var(--accent)" : "var(--text-muted)" }}
              >
                {s === "upload" ? "Configure" : s === "validating" ? "Processing" : "Results"}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 max-w-[1400px] mx-auto w-full">
        {/* ── Left panel: configure ── */}
        <aside
          className="w-full lg:w-[420px] flex-shrink-0 border-r p-6 space-y-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {/* Title */}
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Data Formatter &amp; Validator
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Upload your multi-assay Excel file. The engine validates schema, values, and cross-assay alignment, then outputs LLM-ready structured data.
            </p>
          </div>

          {/* Assay legend */}
          <div
            className="rounded-xl border p-4 space-y-2"
            style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-medium mb-2.5" style={{ color: "var(--text-secondary)" }}>
              Expected Assay Sheets
            </p>
            {[
              { icon: "🔬", name: "H&E and IHC_n=16", label: "Histopathology" },
              { icon: "🧪", name: "Cytokine_n=16", label: "Cytokine Panel" },
              { icon: "🌊", name: "Flowcytometry_n=16", label: "Flow Cytometry" },
              { icon: "🧬", name: "NanoString_n=16", label: "NanoString GEx" },
              { icon: "📋", name: "Assay details", label: "Metadata (optional)" },
            ].map((a) => (
              <div key={a.name} className="flex items-center gap-2.5">
                <span className="text-sm">{a.icon}</span>
                <div>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.label}</span>
                  <span className="text-[10px] ml-1.5 font-mono" style={{ color: "var(--text-muted)" }}>{a.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* File upload */}
          <FileUpload
            file={file}
            onChange={setFile}
            disabled={step === "validating"}
          />

          {/* Arms mapper */}
          <ArmsMapper
            config={armsConfig}
            onChange={setArmsConfig}
            disabled={step === "validating"}
          />

          {/* Error */}
          {error && (
            <div
              className="rounded-lg border p-3 flex items-start gap-2"
              style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)" }}
            >
              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--error)" }} />
              <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleRun}
              disabled={!file || step === "validating"}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent)",
                color: "#fff",
              }}
            >
              {step === "validating" ? (
                <>
                  <Loader2 className="h-4 w-4 spin" />
                  Validating…
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" />
                  Run Validation
                </>
              )}
            </button>
            {step === "results" && (
              <button
                onClick={handleReset}
                className="rounded-xl px-4 py-3 text-sm font-medium border transition-colors hover:bg-white/[0.04]"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Reset
              </button>
            )}
          </div>
        </aside>

        {/* ── Right panel: results ── */}
        <section className="flex-1 flex flex-col min-w-0">
          {step === "upload" && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl mb-5"
                style={{ background: "var(--surface-raised)" }}
              >
                <Activity className="h-9 w-9" style={{ color: "var(--text-muted)" }} />
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                No data loaded yet
              </h2>
              <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
                Upload your Farcast TiME Excel database on the left, configure arms, then click{" "}
                <span style={{ color: "var(--accent)" }}>Run Validation</span>
              </p>
            </div>
          )}

          {step === "validating" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-2 border-blue-500/20"
                />
                <Loader2 className="h-7 w-7 spin" style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Validating assay data…
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Checking schemas, values, and cross-assay alignment
                </p>
              </div>
              {/* Progress stages */}
              <div className="space-y-2 w-64">
                {["Schema validation", "Value checks", "Sample alignment", "Formatting output"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "results" && result && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Tab bar */}
              <div
                className="flex gap-1 px-6 pt-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                {(["validation", "output"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all -mb-px"
                    style={
                      activeTab === tab
                        ? { borderColor: "var(--accent)", color: "var(--accent)", background: "transparent" }
                        : { borderColor: "transparent", color: "var(--text-muted)", background: "transparent" }
                    }
                  >
                    {tab === "validation" ? (
                      <span className="flex items-center gap-1.5">
                        {result.overall_passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" style={{ color: "var(--error)" }} />
                        )}
                        Validation Report
                        {result.error_count > 0 && (
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400">
                            {result.error_count}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <FlaskConical className="h-3.5 w-3.5" />
                        Clean Output
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] bg-emerald-500/15 text-emerald-400">
                          {result.alignment.total_aligned}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "validation" && <ValidationPanel data={result} />}
                {activeTab === "output" && result.clean_data && (
                  <OutputPanel cleanData={result.clean_data} />
                )}
                {activeTab === "output" && !result.clean_data && (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No clean output available — resolve errors first.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
