"use client";
import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, CircleCheck as CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface Props {
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}

export default function FileUpload({ file, onChange, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
        onChange(f);
      }
    },
    [disabled, onChange]
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = "";
  };

  const fmt = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Assay Database
        <span className="text-xs font-normal ml-1 badge badge-accent">.xlsx</span>
      </label>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={clsx(
            "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all cursor-pointer",
            dragging
              ? "border-[var(--accent)] bg-[var(--accent-bg)]"
              : "border-[var(--border-dashed,var(--border))] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]",
            disabled && "opacity-50 pointer-events-none"
          )}
          style={{ background: dragging ? "var(--accent-bg)" : "var(--surface)" }}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl transition-all"
            style={{
              background: dragging ? "var(--accent-light)" : "var(--accent-bg)",
              boxShadow: dragging ? "0 8px 24px rgba(124, 158, 178, 0.2)" : "none"
            }}
          >
            <Upload
              className="h-6 w-6 transition-transform"
              style={{ color: "var(--accent)", transform: dragging ? "translateY(-2px)" : "none" }}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {dragging ? "Drop file here" : "Drop your Excel file here"}
            </p>
            <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
              or click to browse
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: "var(--background-alt)", color: "var(--text-muted)" }}>
              Multi-sheet
            </span>
            <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: "var(--background-alt)", color: "var(--text-muted)" }}>
              All assays
            </span>
          </div>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleInput}
          />
        </div>
      ) : (
        <div
          className="card-premium flex items-center gap-4 p-4 animate-fade-in"
        >
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--success-bg)" }}
          >
            <CheckCircle2 className="h-6 w-6" style={{ color: "var(--success)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {file.name}
            </p>
            <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
              {fmt(file.size)} · Ready for validation
            </p>
          </div>
          {!disabled && (
            <button
              onClick={() => onChange(null)}
              className="flex-shrink-0 rounded-xl p-2.5 transition-all hover:scale-105"
              style={{ background: "var(--error-bg)" }}
              title="Remove file"
            >
              <X className="h-4 w-4" style={{ color: "var(--error)" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
