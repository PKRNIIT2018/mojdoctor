"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import Link from "next/link";
import { api } from "@web/utils/api";
import { DocumentUpload } from "@web/components/documents/document-upload";
import { DocumentList } from "@web/components/documents/document-list";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Pill,
  Plus,
  Trash2,
  Save,
  User,
  Calendar,
  Clock,
  Video,
  Phone,
  Building2,
  FileUp,
  Mic,
  MicOff,
} from "lucide-react";

// ---------- Speech input hook ----------
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: { isFinal: boolean; 0: { transcript: string } }[];
};

function useSpeechInput() {
  const [activeField, setActiveField] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setActiveField(null);
  }, []);

  const toggle = useCallback(
    (fieldKey: string, onTranscript: (text: string) => void) => {
      if (activeField === fieldKey) {
        stop();
        return;
      }
      // Stop any currently running recognition
      recognitionRef.current?.stop();
      recognitionRef.current = null;

      if (!supported) {
        toast.error("Voice input is not supported in this browser");
        return;
      }

      const SR =
        (
          window as unknown as {
            SpeechRecognition: new () => {
              continuous: boolean;
              interimResults: boolean;
              lang: string;
              onresult: ((e: SpeechRecognitionEvent) => void) | null;
              onerror: (() => void) | null;
              onend: (() => void) | null;
              start: () => void;
              stop: () => void;
            };
          }
        ).SpeechRecognition ??
        (
          window as unknown as {
            webkitSpeechRecognition: new () => {
              continuous: boolean;
              interimResults: boolean;
              lang: string;
              onresult: ((e: SpeechRecognitionEvent) => void) | null;
              onerror: (() => void) | null;
              onend: (() => void) | null;
              start: () => void;
              stop: () => void;
            };
          }
        ).webkitSpeechRecognition;

      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i]!.isFinal) transcript += e.results[i]![0]!.transcript;
        }
        if (transcript) onTranscript(transcript.trim());
      };

      rec.onerror = () => {
        toast.error("Microphone error — check browser permissions");
        stop();
      };

      rec.onend = () => {
        recognitionRef.current = null;
        setActiveField(null);
      };

      rec.start();
      recognitionRef.current = rec;
      setActiveField(fieldKey);
    },
    [activeField, stop, supported]
  );

  // Clean up on unmount
  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    []
  );

  return { toggle, stop, activeField, supported };
}
// ---------------------------------------

type Consultation = {
  booking_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  reason: string | null;
  payment_method: string;
  status: string;
  language: string;
  gdpr_consent: string;
  booking_created_at: string;
  date: Date;
  start_time: string;
  end_time: string;
  mode: string;
  case_file_id: string | null;
  video_room_url: string | null;
};

type DoctorNote = {
  id: string;
  case_file_id: string;
  content_markdown: string | null;
  sections: { heading: string; content: string }[] | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

type Prescription = {
  id: string;
  doctor_note_id: string;
  medication_name: string;
  dosage: string;
  instructions: string | null;
  valid_until: string | null;
  created_at: string;
};

const SECTION_HEADINGS = ["Subjective", "Objective", "Assessment", "Plan"];

function useDoctorId() {
  const { data } = useQuery({
    queryKey: ["doctor-me"],
    queryFn: () => api.get<{ id: string }>("/api/doctors/me"),
    staleTime: Infinity,
  });
  return data?.id ?? "";
}

export default function ConsultationsPage() {
  const queryClient = useQueryClient();
  const speech = useSpeechInput();

  const doctorId = useDoctorId();
  const [statusFilter, setStatusFilter] = useState("CONFIRMED");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [sectionContent, setSectionContent] = useState<Record<string, string[]>>({});
  const [summary, setSummary] = useState<Record<string, string>>({});
  const [newRx, setNewRx] = useState<
    Record<
      string,
      { medicationName: string; dosage: string; instructions: string; validUntil: string }
    >
  >({});

  const consultationsQuery = useQuery({
    queryKey: ["consultations", doctorId, statusFilter || "all"],
    queryFn: () => {
      const url = statusFilter
        ? `/api/bookings/doctor/${doctorId}/consultations?status=${statusFilter}`
        : `/api/bookings/doctor/${doctorId}/consultations`;
      return api.get<Consultation[]>(url);
    },
    enabled: !!doctorId,
  });

  const consultations = consultationsQuery.data ?? [];
  const expandedCaseFileId = expandedId
    ? (consultations.find((c) => c.booking_id === expandedId)?.case_file_id ?? null)
    : null;

  const notesQuery = useQuery({
    queryKey: ["notes", expandedCaseFileId],
    queryFn: () => api.get<DoctorNote[]>(`/api/notes/case-file/${expandedCaseFileId}`),
    enabled: !!expandedCaseFileId,
  });

  const currentNote = notesQuery.data?.[0] ?? null;

  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions", currentNote?.id],
    queryFn: () => api.get<Prescription[]>(`/api/notes/${currentNote!.id}/prescriptions`),
    enabled: !!currentNote?.id,
  });

  const [formInitId, setFormInitId] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedId) {
      setFormInitId(null);
      return;
    }
    if (!notesQuery.data || formInitId === expandedId) return;
    if (currentNote) {
      const sections =
        currentNote.sections ?? SECTION_HEADINGS.map((h) => ({ heading: h, content: "" }));
      setSectionContent((prev) => ({
        ...prev,
        [expandedId]: sections.map((s) => s.content),
      }));
      setSummary((prev) => ({ ...prev, [expandedId]: currentNote.summary ?? "" }));
    } else {
      setSectionContent((prev) => ({ ...prev, [expandedId]: SECTION_HEADINGS.map(() => "") }));
      setSummary((prev) => ({ ...prev, [expandedId]: "" }));
    }
    setNewRx((prev) => ({
      ...prev,
      [expandedId]: { medicationName: "", dosage: "", instructions: "", validUntil: "" },
    }));
    setFormInitId(expandedId);
  }, [expandedId, notesQuery.data]);

  const saveNoteMutation = useMutation({
    mutationFn: async ({ bookingId, caseFileId }: { bookingId: string; caseFileId: string }) => {
      const sections = SECTION_HEADINGS.map((heading, i) => ({
        heading,
        content: (sectionContent[bookingId] ?? [])[i] ?? "",
      }));
      const body = { caseFileId, sections, summary: summary[bookingId] ?? "" };
      if (currentNote) {
        return api.put<DoctorNote>(`/api/notes/${currentNote.id}`, body);
      }
      return api.post<DoctorNote>("/api/notes", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", expandedCaseFileId] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions", currentNote?.id] });
      toast.success("Note saved");
    },
    onError: () => {
      toast.error("Failed to save note");
    },
  });

  const addPrescriptionMutation = useMutation({
    mutationFn: async (rx: {
      noteId: string;
      medicationName: string;
      dosage: string;
      instructions?: string;
      validUntil?: string;
    }) => {
      const { noteId, ...payload } = rx;
      return api.post<Prescription>(`/api/notes/${noteId}/prescriptions`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", currentNote?.id] });
      if (expandedId) {
        setNewRx((prev) => ({
          ...prev,
          [expandedId]: { medicationName: "", dosage: "", instructions: "", validUntil: "" },
        }));
      }
      toast.success("Prescription added");
    },
    onError: () => {
      toast.error("Failed to add prescription");
    },
  });

  const removePrescriptionMutation = useMutation({
    mutationFn: (prescriptionId: string) =>
      api.delete(`/api/notes/prescriptions/${prescriptionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", currentNote?.id] });
      toast.success("Prescription removed");
    },
    onError: () => {
      toast.error("Failed to remove prescription");
    },
  });

  const statusCounts = consultations.reduce(
    (acc: Record<string, number>, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      acc["all"] = (acc["all"] || 0) + 1;
      return acc;
    },
    { all: 0 } as Record<string, number>
  );

  const modeIcon = (mode: string) => {
    switch (mode) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      NO_SHOW: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      PENDING_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  const toggleExpand = (bookingId: string) => {
    setExpandedId((prev) => (prev === bookingId ? null : bookingId));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consultations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View consultations and manage clinical notes
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...new Set(consultations.map((c) => c.status))].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === "all" ? "" : s)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              (s === "all" && !statusFilter) || s === statusFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
            }`}
          >
            {s === "all"
              ? `All (${statusCounts.all ?? 0})`
              : `${s.replace(/_/g, " ")} (${statusCounts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {consultationsQuery.isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No consultations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {consultations.map((c) => (
            <Card key={c.booking_id} className="overflow-hidden">
              <button onClick={() => toggleExpand(c.booking_id)} className="w-full text-left">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[120px] text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(c.date).toLocaleDateString("en-GB")}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[80px] text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{c.start_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{c.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[60px]">
                      {modeIcon(c.mode)}
                      <span className="capitalize">{c.mode}</span>
                    </div>
                    <div className="min-w-[100px]">{statusBadge(c.status)}</div>
                    {c.mode === "video" && c.status === "CONFIRMED" && (
                      <Link
                        href={`/dashboard/consult/${c.booking_id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium hover:bg-primary/90"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join
                      </Link>
                    )}
                    {c.status === "COMPLETED" && (
                      <Link
                        href={`/dashboard/consult/${c.booking_id}/summary`}
                        className="inline-flex items-center gap-1 rounded-md bg-muted text-muted-foreground px-2.5 py-1 text-xs font-medium hover:bg-muted/80 hover:text-foreground"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Summary
                      </Link>
                    )}
                    <div className="text-muted-foreground">
                      {expandedId === c.booking_id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </button>

              {expandedId === c.booking_id && (
                <div className="border-t border-border">
                  {!c.case_file_id ? (
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      No case file available. The consultation must be confirmed first.
                    </CardContent>
                  ) : notesQuery.isLoading ? (
                    <CardContent className="p-4 flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </CardContent>
                  ) : (
                    <CardContent className="p-4 space-y-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span className="font-medium">{c.patient_email}</span>
                        </div>
                        {c.patient_phone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span>{" "}
                            <span className="font-medium">{c.patient_phone}</span>
                          </div>
                        )}
                        {c.reason && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Reason:</span>{" "}
                            <span className="font-medium">{c.reason}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            SOAP Notes
                          </h3>
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={saveNoteMutation.isPending}
                            onClick={() =>
                              saveNoteMutation.mutate({
                                bookingId: c.booking_id,
                                caseFileId: c.case_file_id!,
                              })
                            }
                          >
                            {saveNoteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {currentNote ? "Update Note" : "Create Note"}
                          </Button>
                        </div>

                        {SECTION_HEADINGS.map((heading, i) => {
                          const fieldKey = `${c.booking_id}_section_${i}`;
                          const isRecording = speech.activeField === fieldKey;
                          return (
                            <div key={heading} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">
                                  {heading}
                                </label>
                                <button
                                  type="button"
                                  title={isRecording ? "Stop recording" : "Dictate"}
                                  onClick={() =>
                                    speech.toggle(fieldKey, (transcript) => {
                                      const updated = [
                                        ...(sectionContent[c.booking_id] ??
                                          SECTION_HEADINGS.map(() => "")),
                                      ];
                                      const prev = updated[i] ?? "";
                                      updated[i] = prev ? `${prev} ${transcript}` : transcript;
                                      setSectionContent((s) => ({
                                        ...s,
                                        [c.booking_id]: updated,
                                      }));
                                    })
                                  }
                                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                    isRecording
                                      ? "bg-destructive/10 text-destructive animate-pulse"
                                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {isRecording ? (
                                    <MicOff className="h-3 w-3" />
                                  ) : (
                                    <Mic className="h-3 w-3" />
                                  )}
                                  {isRecording ? "Stop" : "Dictate"}
                                </button>
                              </div>
                              <textarea
                                value={(sectionContent[c.booking_id] ?? [])[i] ?? ""}
                                onChange={(e) => {
                                  const updated = [
                                    ...(sectionContent[c.booking_id] ??
                                      SECTION_HEADINGS.map(() => "")),
                                  ];
                                  updated[i] = e.target.value;
                                  setSectionContent((prev) => ({
                                    ...prev,
                                    [c.booking_id]: updated,
                                  }));
                                }}
                                rows={3}
                                className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm resize-y transition-colors ${
                                  isRecording
                                    ? "border-destructive/50 ring-1 ring-destructive/20"
                                    : "border-input"
                                }`}
                                placeholder={`Enter ${heading.toLowerCase()} findings...`}
                              />
                            </div>
                          );
                        })}

                        {(() => {
                          const fieldKey = `${c.booking_id}_summary`;
                          const isRecording = speech.activeField === fieldKey;
                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground">
                                  Summary
                                </label>
                                <button
                                  type="button"
                                  title={isRecording ? "Stop recording" : "Dictate"}
                                  onClick={() =>
                                    speech.toggle(fieldKey, (transcript) =>
                                      setSummary((prev) => ({
                                        ...prev,
                                        [c.booking_id]: prev[c.booking_id]
                                          ? `${prev[c.booking_id]} ${transcript}`
                                          : transcript,
                                      }))
                                    )
                                  }
                                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                    isRecording
                                      ? "bg-destructive/10 text-destructive animate-pulse"
                                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {isRecording ? (
                                    <MicOff className="h-3 w-3" />
                                  ) : (
                                    <Mic className="h-3 w-3" />
                                  )}
                                  {isRecording ? "Stop" : "Dictate"}
                                </button>
                              </div>
                              <textarea
                                value={summary[c.booking_id] ?? ""}
                                onChange={(e) =>
                                  setSummary((prev) => ({
                                    ...prev,
                                    [c.booking_id]: e.target.value,
                                  }))
                                }
                                rows={2}
                                className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm resize-y transition-colors ${
                                  isRecording
                                    ? "border-destructive/50 ring-1 ring-destructive/20"
                                    : "border-input"
                                }`}
                                placeholder="Brief summary..."
                              />
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Pill className="h-4 w-4" />
                          Prescriptions
                        </h3>

                        {!currentNote && (
                          <p className="text-sm text-muted-foreground">
                            Save a note first to add prescriptions.
                          </p>
                        )}

                        {currentNote && (
                          <>
                            {(prescriptionsQuery.data ?? []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {(prescriptionsQuery.data ?? []).map((rx) => (
                                  <div
                                    key={rx.id}
                                    className="flex items-start justify-between p-3 rounded-lg border"
                                  >
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium">{rx.medication_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {rx.dosage}
                                        {rx.instructions && ` — ${rx.instructions}`}
                                      </p>
                                      {rx.valid_until && (
                                        <p className="text-xs text-muted-foreground">
                                          Valid until:{" "}
                                          {new Date(rx.valid_until).toLocaleDateString("en-GB")}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => removePrescriptionMutation.mutate(rx.id)}
                                      className="text-destructive hover:opacity-70"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-end gap-2 p-3 rounded-lg border">
                              <div className="flex-1 space-y-1">
                                <input
                                  value={newRx[c.booking_id]?.medicationName ?? ""}
                                  onChange={(e) =>
                                    setNewRx((prev) => ({
                                      ...prev,
                                      [c.booking_id]: {
                                        ...(prev[c.booking_id] ?? {
                                          medicationName: "",
                                          dosage: "",
                                          instructions: "",
                                          validUntil: "",
                                        }),
                                        medicationName: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Medication"
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <input
                                  value={newRx[c.booking_id]?.dosage ?? ""}
                                  onChange={(e) =>
                                    setNewRx((prev) => ({
                                      ...prev,
                                      [c.booking_id]: {
                                        ...(prev[c.booking_id] ?? {
                                          medicationName: "",
                                          dosage: "",
                                          instructions: "",
                                          validUntil: "",
                                        }),
                                        dosage: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Dosage"
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <input
                                  value={newRx[c.booking_id]?.instructions ?? ""}
                                  onChange={(e) =>
                                    setNewRx((prev) => ({
                                      ...prev,
                                      [c.booking_id]: {
                                        ...(prev[c.booking_id] ?? {
                                          medicationName: "",
                                          dosage: "",
                                          instructions: "",
                                          validUntil: "",
                                        }),
                                        instructions: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Instructions"
                                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                disabled={addPrescriptionMutation.isPending}
                                onClick={() => {
                                  const rx = newRx[c.booking_id];
                                  if (!rx?.medicationName || !rx?.dosage) {
                                    toast.error("Medication name and dosage required");
                                    return;
                                  }
                                  const p: {
                                    noteId: string;
                                    medicationName: string;
                                    dosage: string;
                                    instructions?: string;
                                    validUntil?: string;
                                  } = {
                                    noteId: currentNote.id,
                                    medicationName: rx.medicationName,
                                    dosage: rx.dosage,
                                  };
                                  if (rx.instructions) p.instructions = rx.instructions;
                                  if (rx.validUntil) p.validUntil = rx.validUntil;
                                  addPrescriptionMutation.mutate(p);
                                }}
                              >
                                {addPrescriptionMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                                Add
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <FileUp className="h-4 w-4" />
                          Documents
                        </h3>
                        {currentNote && (
                          <DocumentUpload
                            caseFileId={c.case_file_id!}
                            onUploadComplete={() =>
                              queryClient.invalidateQueries({
                                queryKey: ["documents", c.case_file_id!],
                              })
                            }
                          />
                        )}
                        <DocumentList caseFileId={c.case_file_id!} />
                      </div>
                    </CardContent>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
