"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import { useTranslation, detectLocale } from "@web/lib/i18n";
import {
  Loader2,
  AlertTriangle,
  CalendarDays,
  Clock,
  Video,
  Phone,
  Building2,
  CheckCircle,
  ArrowLeft,
  MailQuestion,
} from "lucide-react";

type Booking = {
  id: string;
  doctor_id: string;
  patient_name: string;
  patient_email: string;
  status: string;
};

type Slot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  mode: string;
};

const modeIcon = (mode: string) => {
  switch (mode) {
    case "video":
      return <Video className="h-4 w-4" />;
    default:
      return <Phone className="h-4 w-4" />;
  }
};

export default function RescheduleBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const [locale, setLocale] = useState<"en" | "sk">("en");
  const { t } = useTranslation(locale);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [mode, setMode] = useState<"pick" | "contact">("pick");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const b = await api.get<Booking>(`/api/bookings/${bookingId}`);
        setBooking(b);

        if (b.status !== "AWAITING_PATIENT_RESCHEDULE") {
          setError("This booking is not available for rescheduling");
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const slotsResp = await api.get<Slot[]>(
          `/api/slots/doctor/${b.doctor_id}?status=open&from=${today}`
        );
        setSlots(slotsResp);
      } catch {
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "contact"
          ? { type: "contact_me", patientEmail: booking?.patient_email }
          : { type: "pick_slot", slotId: selectedSlotId, patientEmail: booking?.patient_email };
      await api.post(`/api/bookings/${bookingId}/reschedule`, body);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reschedule");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-status-confirmed/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-status-confirmed" />
            </div>
            <CardTitle>{t("patient.reschedule.doneTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "contact"
                ? t("patient.reschedule.contactMeSubmitted")
                : t("patient.reschedule.doneText")}
            </p>
            <Button asChild>
              <Link href={`/book/status/${bookingId}`}>
                {t("booking.confirmation.checkStatus")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <CardTitle>Error</CardTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" asChild>
              <Link href="/">{t("booking.actions.returnHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t("patient.reschedule.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setMode("pick")}
              className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                mode === "pick"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <CalendarDays className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">{t("patient.reschedule.title")}</p>
            </button>
            <button
              onClick={() => setMode("contact")}
              className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                mode === "contact"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <MailQuestion className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">{t("patient.reschedule.contactMe")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("patient.reschedule.contactMeDesc")}
              </p>
            </button>
          </div>

          {mode === "pick" && (
            <>
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("patient.reschedule.noSlots")}
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {slots.map((slot) => {
                    const date = new Date(slot.date).toLocaleDateString(
                      locale === "sk" ? "sk-SK" : "en-GB",
                      { weekday: "short", day: "numeric", month: "short" }
                    );
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedSlotId === slot.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:bg-muted border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {modeIcon(slot.mode)}
                            <span className="text-sm font-medium">{date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {slot.start_time} - {slot.end_time}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {mode === "contact" && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center space-y-2">
              <MailQuestion className="h-8 w-8 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("patient.reschedule.contactMeSubmitted")}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{t("patient.reschedule.timeoutInfo")}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => router.back()}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("patient.cancel.goBack")}
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleSubmit}
              disabled={(mode === "pick" && !selectedSlotId) || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("patient.reschedule.confirmBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
