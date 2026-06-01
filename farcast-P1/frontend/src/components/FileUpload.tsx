"use client";
import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
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
      <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Assay Database <span className="text-xs font-normal">(Excel .xlsx)</span>
      </label>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={clsx(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer",
            dragging
              ? "border-blue-500 bg-blue-500/5"
              : "border-[var(--border)] hover:border-blue-500/50 hover:bg-[var(--surface-raised)]",
            disabled && "opacity-50 pointer-events-none"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--surface-raised)" }}
          >
            <Upload className="h-6 w-6" style={{ color: "var(--accent)" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Drop your Excel file here
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              or click to browse — .xlsx containing all 5 assay sheets
            </p>
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
          className="flex items-center gap-4 rounded-xl border p-4"
          style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
        >
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(59,130,246,0.1)" }}
          >
            <FileSpreadsheet className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {file.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {fmt(file.size)}
            </p>
          </div>
          {!disabled && (
            <button
              onClick={() => onChange(null)}
              className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-red-500/10"
              title="Remove file"
            >
              <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
