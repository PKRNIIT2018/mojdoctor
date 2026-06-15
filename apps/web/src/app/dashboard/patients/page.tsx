"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import {
  Users,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  FileText,
  Pill,
  Video,
  Building2,
  Check,
  Upload,
} from "lucide-react";
import { DocumentList } from "@web/components/documents/document-list";
import { DocumentUpload } from "@web/components/documents/document-upload";

type BookingRecord = {
  id: string;
  doctor_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

type BookingWithSlot = {
  booking_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  reason: string | null;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  mode: string;
  case_file_id: string | null;
  booking_created_at: string;
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

type DoctorProfile = {
  id: string;
  name: string;
  email: string;
};

type PatientSummary = {
  email: string;
  name: string;
  phone: string | null;
  totalVisits: number;
  lastVisit: string | null;
  lastStatus: string;
  nextBooking: string | null;
  nextStatus: string | null;
  bookingIds: string[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending",
  AWAITING_CARD: "Awaiting Card",
  CONFIRMED: "Confirmed",
  CAPTURED: "Captured",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED_BY_PATIENT: "Cancelled",
  CANCELLED_BY_DOCTOR: "Cancelled",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  PAYMENT_FAILED: "Payment Failed",
};

type HistoryTab = "all" | "CONFIRMED" | "AWAITING_CARD" | "REJECTED";

const HISTORY_TABS: { key: HistoryTab; label: string }[] = [
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "AWAITING_CARD", label: "Awaiting Card" },
  { key: "REJECTED", label: "Rejected" },
  { key: "all", label: "All" },
];

export default function PatientsPage() {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [patientBookings, setPatientBookings] = useState<BookingWithSlot[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState<Record<string, DoctorNote[]>>({});
  const [bookingPrescriptions, setBookingPrescriptions] = useState<Record<string, Prescription[]>>(
    {}
  );
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [showUpload, setShowUpload] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("CONFIRMED");
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      const doctorData = await api.get<DoctorProfile>("/api/doctors/me");
      setDoctor(doctorData);

      const bookings = await api.get<BookingRecord[]>(`/api/bookings?doctorId=${doctorData.id}`);

      const grouped = new Map<string, PatientSummary>();
      for (const b of bookings) {
        const existing = grouped.get(b.patient_email);
        if (existing) {
          existing.totalVisits++;
          if (!existing.lastVisit || b.created_at > existing.lastVisit) {
            existing.lastVisit = b.created_at;
            existing.lastStatus = b.status;
          }
          existing.bookingIds.push(b.id);
        } else {
          grouped.set(b.patient_email, {
            email: b.patient_email,
            name: b.patient_name,
            phone: b.patient_phone,
            totalVisits: 1,
            lastVisit: b.created_at,
            lastStatus: b.status,
            nextBooking: null,
            nextStatus: null,
            bookingIds: [b.id],
          });
        }
      }

      const sorted = Array.from(grouped.values()).sort((a, b) =>
        (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "")
      );

      setPatients(sorted);
    } catch {
      setError("Failed to load patient data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const openPatient = async (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setLoadingBookings(true);
    setExpandedBooking(null);
    setBookingNotes({});
    setBookingPrescriptions({});
    setHistoryTab("CONFIRMED");
    try {
      const data = await api.get<BookingWithSlot[]>(
        `/api/bookings/patient/${encodeURIComponent(patient.email)}/history?doctorId=${doctor!.id}`
      );
      setPatientBookings(data);
    } catch {
      setError("Failed to load patient bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  const toggleBooking = async (bookingId: string, caseFileId: string | null) => {
    if (expandedBooking === bookingId) {
      setExpandedBooking(null);
      return;
    }
    setExpandedBooking(bookingId);
    if (!caseFileId) return;

    setLoadingDetails((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const notes = await api.get<DoctorNote[]>(`/api/notes/case-file/${caseFileId}`);
      setBookingNotes((prev) => ({ ...prev, [bookingId]: notes }));
      if (notes.length > 0) {
        const rxData = await api.get<Prescription[]>(`/api/notes/${notes[0]!.id}/prescriptions`);
        setBookingPrescriptions((prev) => ({ ...prev, [bookingId]: rxData }));
      } else {
        setBookingPrescriptions((prev) => ({ ...prev, [bookingId]: [] }));
      }
    } catch {
      setError("Failed to load booking details");
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const filtered = searchQuery
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (selectedPatient) {
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={() => setSelectedPatient(null)}
          className="text-sm text-primary hover:underline"
        >
          &larr; Back to all patients
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{selectedPatient.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {selectedPatient.email}
            </span>
            {selectedPatient.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {selectedPatient.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {selectedPatient.totalVisits} visit{selectedPatient.totalVisits !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Booking History</CardTitle>
            {/* Status filter tabs */}
            {!loadingBookings && patientBookings.length > 0 && (
              <div className="flex gap-1 mt-3 border-b">
                {HISTORY_TABS.map((tab) => {
                  const count =
                    tab.key === "all"
                      ? patientBookings.length
                      : patientBookings.filter((b) => b.status === tab.key).length;
                  const isActive = historyTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setHistoryTab(tab.key);
                        setExpandedBooking(null);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[18px] ${
                          isActive
                            ? tab.key === "REJECTED"
                              ? "bg-destructive/10 text-destructive"
                              : tab.key === "AWAITING_CARD"
                                ? "bg-amber-500/10 text-amber-600"
                                : tab.key === "CONFIRMED"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {loadingBookings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : patientBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No bookings found</p>
            ) : (
              (() => {
                const visible =
                  historyTab === "all"
                    ? patientBookings
                    : patientBookings.filter((b) => b.status === historyTab);
                return visible.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No {STATUS_LABELS[historyTab] ?? historyTab} bookings
                  </p>
                ) : (
                  <div className="space-y-2">
                    {visible.map((b) => (
                      <div key={b.booking_id} className="overflow-hidden rounded-lg border">
                        <button
                          onClick={() => toggleBooking(b.booking_id, b.case_file_id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 min-w-[90px] text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{new Date(b.date).toLocaleDateString("en-GB")}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-[60px] text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{b.start_time?.slice(0, 5)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[60px]">
                              {b.mode === "video" ? (
                                <Video className="h-3.5 w-3.5" />
                              ) : b.mode === "phone" ? (
                                <Phone className="h-3.5 w-3.5" />
                              ) : (
                                <Building2 className="h-3.5 w-3.5" />
                              )}
                              <span className="capitalize text-xs">{b.mode}</span>
                            </div>
                            <div className="flex-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  b.status === "COMPLETED" || b.status === "CAPTURED"
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                    : b.status === "CONFIRMED"
                                      ? "bg-primary/10 text-primary"
                                      : b.status === "AWAITING_CARD"
                                        ? "bg-amber-500/10 text-amber-600"
                                        : b.status === "REJECTED" ||
                                            b.status === "CANCELLED_BY_PATIENT" ||
                                            b.status === "CANCELLED_BY_DOCTOR" ||
                                            b.status === "CANCELLED" ||
                                            b.status === "NO_SHOW" ||
                                            b.status === "PAYMENT_FAILED"
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {STATUS_LABELS[b.status] || b.status}
                              </span>
                            </div>
                            {b.reason && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
                                {b.reason}
                              </span>
                            )}
                            <div className="text-muted-foreground">
                              {expandedBooking === b.booking_id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </button>

                        {expandedBooking === b.booking_id && (
                          <div className="border-t border-border">
                            {loadingDetails[b.booking_id] ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                              </div>
                            ) : !b.case_file_id ? (
                              <div className="p-3 text-sm text-muted-foreground bg-muted/20">
                                No case file available for this booking.
                              </div>
                            ) : (
                              <div className="p-3 space-y-4 bg-muted/10">
                                {(bookingNotes[b.booking_id] ?? []).length === 0 ? (
                                  <div className="text-sm text-muted-foreground">
                                    No clinical notes recorded for this visit.
                                  </div>
                                ) : (
                                  (bookingNotes[b.booking_id] ?? []).map((note) => (
                                    <div key={note.id} className="space-y-3">
                                      {note.sections && note.sections.length > 0 && (
                                        <div className="space-y-2">
                                          {note.sections.map((s, i) => (
                                            <div key={i} className="text-sm">
                                              <span className="font-medium text-foreground">
                                                {s.heading}:
                                              </span>{" "}
                                              <span className="text-muted-foreground whitespace-pre-wrap">
                                                {s.content}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {note.summary && (
                                        <div className="text-sm p-2 rounded bg-muted/30 border">
                                          <span className="font-medium text-foreground">
                                            Summary:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {note.summary}
                                          </span>
                                        </div>
                                      )}
                                      <div className="text-xs text-muted-foreground">
                                        <Check className="h-3 w-3 inline mr-1" />
                                        Note written{" "}
                                        {new Date(note.created_at).toLocaleDateString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </div>

                                      {(bookingPrescriptions[b.booking_id] ?? []).length > 0 && (
                                        <div className="space-y-1.5">
                                          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                                            <Pill className="h-3 w-3" />
                                            Prescriptions
                                          </p>
                                          <div className="grid gap-1.5">
                                            {(bookingPrescriptions[b.booking_id] ?? []).map(
                                              (rx) => (
                                                <div
                                                  key={rx.id}
                                                  className="text-xs p-2 rounded border bg-background"
                                                >
                                                  <span className="font-medium">
                                                    {rx.medication_name}
                                                  </span>{" "}
                                                  <span className="text-muted-foreground">
                                                    {rx.dosage}
                                                  </span>
                                                  {rx.instructions && (
                                                    <span className="text-muted-foreground">
                                                      {" "}
                                                      — {rx.instructions}
                                                    </span>
                                                  )}
                                                  {rx.valid_until && (
                                                    <span className="text-muted-foreground block">
                                                      Valid until:{" "}
                                                      {new Date(rx.valid_until).toLocaleDateString(
                                                        "en-GB"
                                                      )}
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {b.case_file_id && (
                                        <div className="space-y-1.5 border-t pt-3">
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                                              <FileText className="h-3 w-3" />
                                              Documents
                                            </p>
                                            <button
                                              onClick={() =>
                                                setShowUpload(
                                                  showUpload === b.case_file_id
                                                    ? null
                                                    : b.case_file_id!
                                                )
                                              }
                                              className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                            >
                                              <Upload className="h-3 w-3" />
                                              {showUpload === b.case_file_id ? "Cancel" : "Upload"}
                                            </button>
                                          </div>
                                          <DocumentList caseFileId={b.case_file_id} />
                                          {showUpload === b.case_file_id && (
                                            <DocumentUpload
                                              caseFileId={b.case_file_id}
                                              onUploadComplete={() => setShowUpload(null)}
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {patients.length} patient{patients.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-md border bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No patients match your search" : "No patients yet"}
              </p>
              {!searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Patients appear here after their first booking
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((patient) => (
                <button
                  key={patient.email}
                  onClick={() => openPatient(patient)}
                  className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{patient.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {patient.email}
                        </span>
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{patient.totalVisits}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.totalVisits === 1 ? "visit" : "visits"}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      {patient.lastVisit && (
                        <>
                          <p className="text-xs text-muted-foreground">Last visit</p>
                          <p className="text-xs text-foreground">
                            {new Date(patient.lastVisit).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
