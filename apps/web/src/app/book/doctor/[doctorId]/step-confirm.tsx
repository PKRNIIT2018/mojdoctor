"use client";

import Link from "next/link";
import { Card } from "@web/components/ui/card";
import {
  User,
  CalendarDays,
  Clock,
  Video,
  Phone,
  Lock,
  ShieldCheck,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Slot, FormState, formatDate } from "./use-booking-state";

type Props = {
  bookingStatus: string | null;
  bookingId: string;
  selectedSlot: Slot | null;
  form: FormState;
  locale: string;
  t: (path: string) => string;
};

export function StepConfirm({ bookingStatus, bookingId, selectedSlot, form, locale, t }: Props) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {bookingStatus === "PENDING_REVIEW" ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <CheckCircle className="h-8 w-8 text-status-confirmed" />
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {bookingStatus === "CONFIRMED"
              ? t("booking.confirmation.confirmed")
              : t("booking.confirmation.submitted")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bookingStatus === "CONFIRMED"
              ? t("booking.confirmation.confirmedText")
              : t("booking.confirmation.submittedText")}
          </p>
          <div className="bg-muted rounded-lg p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{form.patientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{selectedSlot ? formatDate(selectedSlot.date, locale) : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedSlot?.start_time} - {selectedSlot?.end_time}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {selectedSlot?.mode === "video" ? (
                <Video className="h-4 w-4 text-video-indicator" />
              ) : (
                <Phone className="h-4 w-4 text-inperson-indicator" />
              )}
              <span className="capitalize">{selectedSlot?.mode}</span>
            </div>
            {form.documentPin && (
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>{t("booking.confirmation.pinSet")}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-status-confirmed">
              <ShieldCheck className="h-4 w-4" />
              <span>GDPR Consent: {form.gdprConsent ? "Granted" : "Denied"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {bookingStatus === "PENDING_REVIEW" && (
              <Link
                href={`/book/status/${bookingId}`}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium"
              >
                {t("booking.confirmation.checkStatus")}
              </Link>
            )}
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("booking.actions.returnHome")}
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
