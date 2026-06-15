"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@web/utils/api";
import { Button } from "@web/components/ui/button";
import {
  Loader2,
  Phone,
  Video,
  Mic,
  MicOff,
  Save,
  X,
  CheckCircle,
  ChevronLeft,
  Clock,
  User,
  AlertTriangle,
} from "lucide-react";

type SpeechRecognitionType = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

type BookingDetail = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  reason: string | null;
  status: string;
  language: string;
  video_room_url: string | null;
  slot?: {
    date: string;
    start_time: string;
    end_time: string;
    mode: string;
  };
};

type NoteSection = { heading: string; content: string };

const SOAP_SECTIONS = [
  {
    key: "subjective",
    heading: "Subjective",
    placeholder: "Patient's reported symptoms, history, and concerns...",
  },
  {
    key: "objective",
    heading: "Objective",
    placeholder: "Vital signs, physical exam findings, observations...",
  },
  {
    key: "assessment",
    heading: "Assessment",
    placeholder: "Diagnosis, differential, clinical impressions...",
  },
  {
    key: "plan",
    heading: "Plan",
    placeholder: "Treatment plan, medications, follow-up, referrals...",
  },
] as const;

export default function ConsultPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [hostUrl, setHostUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [noteId, setNoteId] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [listening, setListening] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("subjective");
  const [ending, setEnding] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const b = await api.get<BookingDetail & { slot?: BookingDetail["slot"] }>(
          `/api/bookings/${bookingId}`
        );
        setBooking(b as BookingDetail);

        if (b.video_room_url) {
          setHostUrl(b.video_room_url);
        } else {
          const room = await api.post<{ hostRoomUrl: string }>("/api/video/rooms", { bookingId });
          setHostUrl(room.hostRoomUrl);
        }

        const caseFile = await api.get<{ id: string }[]>(`/api/case-files/booking/${bookingId}`);
        const file = caseFile[0];
        if (file?.id) {
          const notes = await api.get<(NoteSection & { id: string; sections: string })[]>(
            `/api/notes/case-file/${file.id}`
          );
          if (notes.length > 0 && notes[0]) {
            setNoteId(notes[0].id);
            try {
              const parsed = JSON.parse(notes[0].sections || "[]") as {
                heading: string;
                content: string;
              }[];
              const sectionMap: Record<string, string> = {};
              for (const s of parsed) {
                const found = SOAP_SECTIONS.find((ss) => ss.heading === s.heading);
                if (found) sectionMap[found.key] = s.content;
              }
              setSections(sectionMap);
            } catch {}
          }
        }
      } catch {
        setError("Failed to load consultation");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const saveNotes = useCallback(
    async (secs: Record<string, string>) => {
      const sectionArray: NoteSection[] = SOAP_SECTIONS.map((s) => ({
        heading: s.heading,
        content: secs[s.key] ?? "",
      }));
      try {
        setSaving(true);
        if (noteId) {
          await api.put(`/api/notes/${noteId}`, { sections: sectionArray });
        }
        setLastSaved(new Date());
      } catch {
        // silently fail — auto-save
      } finally {
        setSaving(false);
      }
    },
    [noteId]
  );

  const handleSectionChange = (key: string, value: string) => {
    const next = { ...sections, [key]: value };
    setSections(next);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNotes(next), 2000);
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR || typeof SR !== "function") {
      setError("Voice input is not supported in this browser");
      return;
    }

    const recognition = new (SR as new () => SpeechRecognitionType)();
    recognition.lang = booking?.language === "sk" ? "sk-SK" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        const alt = event.results[i]?.[0];
        if (alt) transcript += alt.transcript;
      }
      setSections((prev) => ({
        ...prev,
        [activeSection]: (prev[activeSection] ?? "") + " " + transcript,
      }));
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const handleEndConsult = async () => {
    if (!confirm("End this consultation?")) return;
    setEnding(true);
    try {
      await saveNotes(sections);
      await api.post(`/api/bookings/${bookingId}/status`, { status: "COMPLETED" });
      router.push("/dashboard/consultations");
    } catch {
      setError("Failed to end consultation");
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-dvh">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 max-w-lg mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Link
              href="/dashboard/consultations"
              className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block"
            >
              ← Back to consultations
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-dvh">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/consultations">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{booking?.patient_name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {booking?.slot?.mode === "video" ? (
                <Video className="h-3 w-3" />
              ) : (
                <Phone className="h-3 w-3" />
              )}
              <span>
                {booking?.slot?.date} {booking?.slot?.start_time} - {booking?.slot?.end_time}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3 animate-pulse" /> Saving...
            </span>
          )}
          {lastSaved && !saving && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={handleEndConsult} disabled={ending} variant="destructive" size="sm">
            {ending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            End Consult
          </Button>
        </div>
      </header>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video */}
        <div className="flex-1 bg-black relative">
          {hostUrl ? (
            <iframe
              src={hostUrl}
              allow="camera; microphone; fullscreen"
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/60">
                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Video room not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: SOAP Notes */}
        <div className="w-[420px] border-l bg-background flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 shrink-0 overflow-x-auto">
            {SOAP_SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeSection === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s.heading}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={toggleVoiceInput}
              className={`rounded-full p-1.5 transition-colors ${
                listening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={listening ? "Stop recording" : "Start voice input"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {SOAP_SECTIONS.map((s) => (
              <div key={s.key} className={activeSection === s.key ? "" : "hidden"}>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  {s.heading}
                </label>
                <textarea
                  value={sections[s.key] ?? ""}
                  onChange={(e) => handleSectionChange(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  className="w-full h-[calc(100vh-220px)] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center gap-2 shrink-0">
            <User className="h-3 w-3" />
            <span>{booking?.patient_name}</span>
            <span className="text-muted-foreground/50">|</span>
            <Clock className="h-3 w-3" />
            <span>
              {booking?.slot?.start_time} - {booking?.slot?.end_time}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
