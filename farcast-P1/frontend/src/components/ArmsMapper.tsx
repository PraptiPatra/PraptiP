"use client";
import { ArmsConfig } from "@/lib/api";
import { Settings2, FileSliders as Sliders, FlaskConical } from "lucide-react";

const ASSAY_LABELS: Record<string, string> = {
  histopathology: "H&E + IHC",
  cytokine: "Cytokine",
  flow_cytometry: "Flow Cytometry",
  nanostring: "NanoString",
};

const ASSAY_COLORS: Record<string, { bg: string; text: string }> = {
  histopathology: { bg: "var(--histopathology-light)", text: "var(--histopathology)" },
  cytokine: { bg: "var(--cytokine-light)", text: "var(--cytokine)" },
  flow_cytometry: { bg: "var(--flow-cytometry-light)", text: "var(--flow-cytometry)" },
  nanostring: { bg: "var(--nanostring-light)", text: "var(--nanostring)" },
};

const ALL_ARMS = ["Rx-A", "Rx-B", "Rx-C", "Arm-1"];

interface Props {
  config: ArmsConfig;
  onChange: (c: ArmsConfig) => void;
  useFeatureSelection: boolean;
  onFeatureSelectionChange: (v: boolean) => void;
  disabled?: boolean;
}

const inputStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "13px",
  color: "var(--text-primary)",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

export default function ArmsMapper({ config, onChange, useFeatureSelection, onFeatureSelectionChange, disabled }: Props) {
  const setControl = (v: string) =>
    onChange({
      ...config,
      control_arm: v,
      treated_arms: config.treated_arms.filter((a) => a !== v),
    });

  const toggleTreated = (arm: string) => {
    const next = config.treated_arms.includes(arm)
      ? config.treated_arms.filter((a) => a !== arm)
      : [...config.treated_arms, arm];
    onChange({ ...config, treated_arms: next });
  };

  const setTP = (field: "baseline_timepoints" | "post_treatment_timepoints", assay: string, v: string) =>
    onChange({ ...config, [field]: { ...config[field], [assay]: v } });

  return (
    <div className="card-premium p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--accent-bg)" }}
        >
          <Settings2 className="h-4 w-4" style={{ color: "var(--accent)" }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Arms &amp; Timepoint Mapping
        </h3>
      </div>

      {/* Control arm */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Control Arm
          </label>
          <select
            className="w-full rounded-xl border px-4 py-3 text-sm font-medium transition-all focus:outline-none"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            value={config.control_arm}
            onChange={(e) => setControl(e.target.value)}
            disabled={disabled}
          >
            {ALL_ARMS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Treatment Arm(s)
          </label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {ALL_ARMS.filter((a) => a !== config.control_arm).map((arm) => (
              <button
                key={arm}
                onClick={() => !disabled && toggleTreated(arm)}
                className="rounded-xl px-4 py-2 text-xs font-semibold border-2 transition-all"
                style={
                  config.treated_arms.includes(arm)
                    ? {
                        background: "var(--accent-bg)",
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
                        boxShadow: "0 2px 8px rgba(124, 158, 178, 0.15)",
                      }
                    : {
                        background: "transparent",
                        borderColor: "var(--border)",
                        color: "var(--text-muted)",
                      }
                }
              >
                {arm}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature selection toggle */}
      <div
        className="flex items-center justify-between rounded-xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--background-alt)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: useFeatureSelection ? "var(--accent-bg)" : "transparent" }}
          >
            <Sliders className="h-4 w-4" style={{ color: useFeatureSelection ? "var(--accent)" : "var(--text-muted)" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Feature Selection
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Spearman correlation · p ≤ 0.08 · top-20 fallback
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={useFeatureSelection}
          onClick={() => !disabled && onFeatureSelectionChange(!useFeatureSelection)}
          className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-all duration-200 focus:outline-none"
          style={{
            background: useFeatureSelection ? "var(--accent)" : "var(--border)",
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: useFeatureSelection ? "0 2px 8px rgba(124, 158, 178, 0.3)" : "none",
          }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 rounded-full shadow transition-transform duration-200"
            style={{
              background: "white",
              transform: useFeatureSelection ? "translateX(20px)" : "translateX(0px)",
            }}
          />
        </button>
      </div>

      {/* Timepoints per assay */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Timepoints per Assay
          </p>
        </div>
        <div className="space-y-3">
          {Object.keys(ASSAY_LABELS).map((assay) => {
            const colors = ASSAY_COLORS[assay] || { bg: "var(--surface)", text: "var(--text-primary)" };
            return (
              <div key={assay} className="grid grid-cols-3 items-center gap-3 p-2 px-3 rounded-xl" style={{ background: "var(--surface)" }}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: colors.text }}
                  />
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    {ASSAY_LABELS[assay]}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1.5 uppercase" style={{ color: "var(--text-faint)" }}>Baseline</label>
                  <input
                    className="input-base w-full"
                    value={config.baseline_timepoints[assay] ?? ""}
                    onChange={(e) => setTP("baseline_timepoints", assay, e.target.value)}
                    disabled={disabled}
                    placeholder="TBL"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold mb-1.5 uppercase" style={{ color: "var(--text-faint)" }}>Post-Tx</label>
                  <input
                    className="input-base w-full"
                    value={config.post_treatment_timepoints[assay] ?? ""}
                    onChange={(e) => setTP("post_treatment_timepoints", assay, e.target.value)}
                    disabled={disabled}
                    placeholder="T72"
                    style={inputStyle}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
