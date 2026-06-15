import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@web/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import {
  ChevronLeft,
  User,
  CalendarDays,
  Video,
  Phone,
  Building2,
  FileText,
  Pill,
  Download,
} from "lucide-react";
import { PrintButton } from "./print-button";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    NO_SHOW: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    CANCELLED_BY_PATIENT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    CANCELLED_BY_DOCTOR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ModeIcon({ mode }: { mode: string }) {
  switch (mode) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "phone":
      return <Phone className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
}

export default async function ConsultationSummaryPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { bookingId } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("booking")
    .select("*, slot:slot_id(*)")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.doctor_id !== user.id) return notFound();

  const { data: caseFiles } = await admin
    .from("case_file")
    .select("id")
    .eq("booking_id", bookingId)
    .limit(1);

  const caseFile = caseFiles?.[0] ?? null;

  interface Section {
    heading: string;
    content: string;
  }

  interface NoteData {
    id: string;
    content_markdown: string | null;
    sections: Section[] | string | null;
    summary: string | null;
    created_at: string;
    updated_at: string;
  }

  let note: NoteData | null = null;
  let prescriptions: PrescriptionData[] = [];

  if (caseFile) {
    const { data: notes } = await admin
      .from("doctor_note")
      .select("*")
      .eq("case_file_id", caseFile.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (notes && notes.length > 0) {
      const raw = notes[0] as NoteData | undefined;
      if (raw) {
        note = raw;
        if (typeof note.sections === "string") {
          try {
            note = { ...note, sections: JSON.parse(note.sections) };
          } catch {
            /* keep as-is */
          }
        }

        const { data: rx } = await admin
          .from("prescription")
          .select("*")
          .eq("doctor_note_id", note.id);
        prescriptions = (rx ?? []) as PrescriptionData[];
      }
    }
  }

  const sections = note?.sections && Array.isArray(note.sections) ? note.sections : [];

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/consultations"
            className="rounded-full p-1.5 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Consultation Summary</h1>
            <p className="text-sm text-muted-foreground">Booking #{bookingId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
          <PrintButton />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Patient</span>
              <p className="font-medium flex items-center gap-1.5 mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
                {booking.patient_name}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <StatusBadge status={booking.status} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Date & Time</span>
              <p className="font-medium flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {booking.slot?.date} {booking.slot?.start_time} - {booking.slot?.end_time}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Mode</span>
              <p className="font-medium flex items-center gap-1.5 mt-0.5">
                <ModeIcon mode={booking.slot?.mode ?? "video"} />
                <span className="capitalize">{booking.slot?.mode ?? "video"}</span>
              </p>
            </div>
            {booking.reason && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Reason for visit</span>
                <p className="font-medium mt-0.5">{booking.reason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {note ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                SOAP Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {sections.length > 0 ? (
                sections.map((s: Section) => (
                  <div key={s.heading}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {s.heading}
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{s.content || "—"}</p>
                  </div>
                ))
              ) : note.content_markdown ? (
                <p className="text-sm whitespace-pre-wrap">{note.content_markdown}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes recorded</p>
              )}
              {note.summary && (
                <div className="border-t pt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Summary
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{note.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {prescriptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Prescriptions ({prescriptions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-2">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="flex items-start justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{rx.medication_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rx.dosage}
                        {rx.instructions && ` — ${rx.instructions}`}
                      </p>
                      {rx.valid_until && (
                        <p className="text-xs text-muted-foreground">
                          Valid until: {new Date(rx.valid_until).toLocaleDateString("en-GB")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No clinical notes for this consultation
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between text-xs text-muted-foreground pt-2 pb-8">
        <Link href="/dashboard/consultations" className="hover:text-foreground">
          &larr; Back to consultations
        </Link>
        {note && <span>Last updated: {new Date(note.updated_at).toLocaleString("en-GB")}</span>}
      </div>
    </main>
  );
}

interface PrescriptionData {
  id: string;
  medication_name: string;
  dosage: string;
  instructions: string | null;
  valid_until: string | null;
}
