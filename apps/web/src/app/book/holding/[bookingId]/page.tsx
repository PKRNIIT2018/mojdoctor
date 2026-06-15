"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@web/utils/api";
import { Button } from "@web/components/ui/button";
import { Card, CardContent } from "@web/components/ui/card";
import { useTranslation, detectLocale } from "@web/lib/i18n";
import {
  Loader2,
  Clock,
  Video,
  User,
  CalendarDays,
  ChevronLeft,
  ShieldCheck,
  MapPin,
  XCircle,
} from "lucide-react";

type BookingData = {
  id: string;
  patient_name: string;
  patient_email: string;
  status: string;
  video_room_url: string | null;
  slot_date?: string;
  slot_start_time?: string;
  slot_end_time?: string;
  slot_mode?: string;
  gdpr_consent?: string;
  clinic_address?: string;
};

export default function HoldingPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [locale, setLocale] = useState<"en" | "sk">("en");
  const { t } = useTranslation(locale);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const data = await api.get<BookingData>(`/api/bookings/${bookingId}`);
        if (!mounted) return;
        setBooking(data);
      } catch {
        // retry
      } finally {
        if (mounted) setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [bookingId]);

  const isReady = booking?.status === "CONFIRMED" || booking?.status === "COMPLETED";
  const isVideo = booking?.slot_mode === "video";

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">{t("patient.status.actions.notFound")}</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            {t("booking.actions.returnHome")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-semibold text-sm flex-1">
          {isVideo ? "Video Consultation" : t("patient.holding.inPersonTitle")}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-destructive hover:text-destructive"
        >
          <Link href={`/book/${bookingId}/cancel`} className="flex items-center gap-1 text-xs">
            <XCircle className="h-3.5 w-3.5" />
            {t("patient.status.actions.cancel")}
          </Link>
        </Button>
      </header>

      {isReady && isVideo ? (
        <div className="flex-1 flex">
          {booking.video_room_url ? (
            <iframe
              src={booking.video_room_url + "?iframe=true"}
              allow="camera; microphone; fullscreen"
              className="flex-1 border-0"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/50">
              <div className="text-center space-y-3">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("patient.holding.videoNotReady")}
                </p>
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      ) : isReady && !isVideo ? (
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="w-full max-w-sm text-center space-y-4 p-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t("patient.holding.inPersonTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("patient.holding.inPersonDesc")}</p>
            {booking.clinic_address && (
              <p className="text-sm font-medium text-foreground bg-muted rounded-lg p-3">
                {booking.clinic_address}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-primary animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("patient.holding.waitingTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {t("patient.holding.waitingDesc")}
              </p>
            </div>

            <Card>
              <CardContent className="space-y-2 p-4 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{booking.patient_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {booking.slot_date
                      ? new Date(booking.slot_date.split("T")[0] + "T00:00:00").toLocaleDateString(
                          locale === "sk" ? "sk-SK" : "en-GB",
                          { weekday: "long", day: "numeric", month: "long" }
                        )
                      : "—"}{" "}
                    {t("booking.status.at")} {booking.slot_start_time ?? "—"}
                  </span>
                </div>
                {booking.slot_mode && (
                  <div className="flex items-center gap-2 text-sm">
                    {isVideo ? (
                      <Video className="h-4 w-4 text-cyan-600 shrink-0" />
                    ) : (
                      <MapPin className="h-4 w-4 text-violet-600 shrink-0" />
                    )}
                    <span className="capitalize">{booking.slot_mode}</span>
                  </div>
                )}
                {booking.gdpr_consent && (
                  <div className="flex items-center gap-2 text-sm text-status-confirmed">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>
                      GDPR Consent: {booking.gdpr_consent === "granted" ? "Granted" : "Not Granted"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("patient.holding.checking")}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
