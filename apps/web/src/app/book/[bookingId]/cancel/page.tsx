"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import { useTranslation } from "@web/lib/i18n";
import { useLocale } from "@web/hooks/use-locale";
import { Loader2, AlertTriangle, XCircle, ArrowLeft, CheckCircle, Clock } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  patient_name: string;
  patient_email: string;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  mode: string;
};

export default function CancelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const locale = useLocale();
  const { t } = useTranslation(locale);

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLateCancel, setIsLateCancel] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const b = await api.get<Booking>(`/api/bookings/${bookingId}`);
        setBooking(b);

        const slotDate = new Date(b.slot_date.split("T")[0] + "T" + b.slot_start_time);
        const now = new Date();
        const hoursUntilSlot = (slotDate.getTime() - now.getTime()) / 3600000;
        setIsLateCancel(hoursUntilSlot < 24);
      } catch {
        setError(t("patient.status.actions.notFound"));
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, t]);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      await api.post(`/api/bookings/${bookingId}/cancel-patient`, {
        isLate: isLateCancel,
        patientEmail: booking?.patient_email,
      });
      setCancelled(true);
    } catch {
      setError(t("patient.cancel.errorFailed"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </main>
    );
  }

  if (cancelled) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-status-confirmed/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-status-confirmed" />
            </div>
            <CardTitle>{t("patient.cancel.confirmTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("patient.cancel.confirmText")}</p>
            <Button asChild>
              <Link href="/">{t("booking.actions.returnHome")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            {t("patient.cancel.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("patient.cancel.subtitle")}</p>

          <p className="text-xs text-muted-foreground">{t("patient.cancel.undoWarning")}</p>

          {booking && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <p className="text-sm font-medium text-foreground">{booking.patient_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(booking.slot_date.split("T")[0] + "T00:00:00").toLocaleDateString(
                  locale === "sk" ? "sk-SK" : "en-GB",
                  { weekday: "long", day: "numeric", month: "long", year: "numeric" }
                )}{" "}
                {t("booking.status.at")} {booking.slot_start_time}
              </p>
            </div>
          )}

          {isLateCancel && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{t("patient.cancel.cutoffLate")}</p>
            </div>
          )}

          {!isLateCancel && booking && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-start gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{t("patient.cancel.cutoffInfo")}</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => router.back()}
              disabled={cancelling}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("patient.cancel.goBack")}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("patient.cancel.confirmBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
