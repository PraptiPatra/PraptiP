"use client";
import { ArmsConfig } from "@/lib/api";
import { Settings2 } from "lucide-react";

const ASSAY_LABELS: Record<string, string> = {
  histopathology: "H&E + IHC",
  cytokine: "Cytokine",
  flow_cytometry: "Flow Cytometry",
  nanostring: "NanoString",
};

const ALL_ARMS = ["Rx-A", "Rx-B", "Rx-C", "Arm-1"];

interface Props {
  config: ArmsConfig;
  onChange: (c: ArmsConfig) => void;
  disabled?: boolean;
}

const sel =
  "w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const selStyle = {
  background: "var(--background)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};

export default function ArmsMapper({ config, onChange, disabled }: Props) {
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
    <div
      className="rounded-xl border p-5 space-y-5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4" style={{ color: "var(--accent)" }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Arms &amp; Timepoint Mapping
        </h3>
      </div>

      {/* Control arm */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Control Arm
          </label>
          <select
            className={sel}
            style={selStyle}
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
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Treatment Arm(s)
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {ALL_ARMS.filter((a) => a !== config.control_arm).map((arm) => (
              <button
                key={arm}
                onClick={() => !disabled && toggleTreated(arm)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium border transition-all"
                style={
                  config.treated_arms.includes(arm)
                    ? {
                        background: "rgba(59,130,246,0.15)",
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
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

      {/* Timepoints per assay */}
      <div>
        <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
          Timepoints per Assay
        </p>
        <div className="space-y-2">
          {Object.keys(ASSAY_LABELS).map((assay) => (
            <div key={assay} className="grid grid-cols-3 items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {ASSAY_LABELS[assay]}
              </span>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Baseline</label>
                <input
                  className={sel}
                  style={selStyle}
                  value={config.baseline_timepoints[assay] ?? ""}
                  onChange={(e) => setTP("baseline_timepoints", assay, e.target.value)}
                  disabled={disabled}
                  placeholder="e.g. TBL"
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Post-Treatment</label>
                <input
                  className={sel}
                  style={selStyle}
                  value={config.post_treatment_timepoints[assay] ?? ""}
                  onChange={(e) => setTP("post_treatment_timepoints", assay, e.target.value)}
                  disabled={disabled}
                  placeholder="e.g. T72"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
