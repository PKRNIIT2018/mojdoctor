"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@web/components/ui/button";
import { Loader2, Upload, X, FileIcon } from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/rtf",
  "text/rtf",
];
const CATEGORIES = [
  { value: "", label: "General" },
  { value: "lab-result", label: "Lab Result" },
  { value: "imaging", label: "Imaging" },
  { value: "consent", label: "Consent Form" },
  { value: "referral", label: "Referral" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SelectedFile = {
  file: File;
  category: string;
};

export function DocumentUpload({
  caseFileId,
  onUploadComplete,
}: {
  caseFileId: string;
  onUploadComplete: () => void;
}) {
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) return `File too large (${formatSize(file.size)}). Max 10 MB.`;
    if (!ALLOWED_TYPES.includes(file.type) && file.type) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (
        ![
          "pdf",
          "jpg",
          "jpeg",
          "png",
          "webp",
          "tiff",
          "tif",
          "docx",
          "xlsx",
          "pptx",
          "txt",
          "rtf",
        ].includes(ext ?? "")
      ) {
        return `File type "${file.type || ext}" not supported.`;
      }
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelected({ file, category: "" });
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!selected || !caseFileId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected.file);
      if (selected.category) formData.append("category", selected.category);

      const tokenRes = await fetch("/api/auth/session", { method: "GET" });
      const session = await tokenRes.json();
      const token = session?.access_token ?? null;

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/case-files/${caseFileId}/upload`,
        { method: "POST", headers, body: formData }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      toast.success("Document uploaded");
      setSelected(null);
      onUploadComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 bg-muted/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleInput}
          className="hidden"
        />
        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Drop a file here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, images, Office docs — max 10 MB</p>
      </div>

      {selected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border">
          <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(selected.file.size)}</p>
          </div>
          <select
            value={selected.category}
            onChange={(e) => setSelected({ ...selected, category: e.target.value })}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload
          </Button>
          <button
            onClick={() => setSelected(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
