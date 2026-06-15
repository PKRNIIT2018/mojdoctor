"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@web/utils/api";
import { Button } from "@web/components/ui/button";
import { FileIcon, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Document = {
  id: string;
  case_file_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  r2_key: string | null;
  category: string | null;
  created_at: string;
};

const MIME_ICONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/tiff": "image",
  "text/plain": "text",
  "text/rtf": "text",
};

const CATEGORY_LABELS: Record<string, string> = {
  "lab-result": "Lab Result",
  imaging: "Imaging",
  consent: "Consent Form",
  referral: "Referral",
  prescription: "Prescription",
  other: "Other",
};

function getDriveUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ caseFileId }: { caseFileId: string }) {
  const queryClient = useQueryClient();

  const docsQuery = useQuery({
    queryKey: ["documents", caseFileId],
    queryFn: () => api.get<Document[]>(`/api/case-files/${caseFileId}/documents`),
    enabled: !!caseFileId,
  });

  const removeMutation = useMutation({
    mutationFn: (documentId: string) => api.delete(`/api/case-files/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", caseFileId] });
      toast.success("Document removed");
    },
    onError: () => toast.error("Failed to remove document"),
  });

  const docs = docsQuery.data ?? [];

  if (docsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No documents uploaded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border">
          <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[doc.category ?? ""] ?? doc.category}
              {doc.file_size && ` · ${formatSize(doc.file_size)}`}
              {doc.mime_type && ` · ${doc.mime_type}`}
            </p>
          </div>
          {doc.r2_key && (
            <a href={getDriveUrl(doc.r2_key)} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Button>
            </a>
          )}
          <button
            onClick={() => removeMutation.mutate(doc.id)}
            className="text-destructive hover:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
