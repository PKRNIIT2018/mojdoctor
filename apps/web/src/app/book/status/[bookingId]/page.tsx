"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import { useTranslation } from "@web/lib/i18n";
import { useLocale } from "@web/hooks/use-locale";
import {
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  CalendarDays,
  ChevronLeft,
  RefreshCw,
  ShieldCheck,
  CalendarX,
  CalendarSync,
  MessageCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; labelKey: string }> =
  {
    PENDING_REVIEW: { icon: Clock, color: "text-status-pending", labelKey: "Awaiting Review" },
    AWAITING_CARD: { icon: Clock, color: "text-status-pending", labelKey: "Awaiting Card Payment" },
    AWAITING_PATIENT_RESCHEDULE: {
      icon: Clock,
      color: "text-status-pending",
      labelKey: "Reschedule Needed",
    },
    AWAITING_DOCTOR_REAPPROVAL: {
      icon: Clock,
      color: "text-status-pending",
      labelKey: "Awaiting Re-approval",
    },
    CONFIRMED: { icon: CheckCircle, color: "text-status-confirmed", labelKey: "Confirmed" },
    CAPTURED: { icon: CheckCircle, color: "text-status-captured", labelKey: "Payment Captured" },
    COMPLETED: { icon: CheckCircle, color: "text-status-completed", labelKey: "Completed" },
    CANCELLED_BY_PATIENT: { icon: XCircle, color: "text-status-rejected", labelKey: "Cancelled" },
    CANCELLED_BY_DOCTOR: {
      icon: XCircle,
      color: "text-status-rejected",
      labelKey: "Cancelled by Doctor",
    },
    REJECTED: { icon: XCircle, color: "text-status-rejected", labelKey: "Not Approved" },
    NO_SHOW: { icon: AlertTriangle, color: "text-status-noshow", labelKey: "No Show" },
    PAYMENT_FAILED: {
      icon: AlertTriangle,
      color: "text-status-rejected",
      labelKey: "Payment Failed",
    },
  };

const CANCELLABLE_STATUSES = new Set(["PENDING_REVIEW", "CONFIRMED", "CAPTURED"]);
const RESCHEDULABLE_STATUS = "AWAITING_PATIENT_RESCHEDULE";

export default function BookingStatusPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const locale = useLocale();
  const { t } = useTranslation(locale);

  const [status, setStatus] = useState<string | null>(null);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get<{ status: string }>(`/api/bookings/${bookingId}/status`);
      setStatus(res.status);
      if (res.status !== "NOT_FOUND") {
        const full = await api.get<Record<string, unknown>>(`/api/bookings/${bookingId}`);
        setBooking(full);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const config = status ? STATUS_CONFIG[status] : null;
  const Icon = config?.icon || Clock;

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold">{t("patient.status.actions.notFound")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("patient.status.actions.notFoundText")}
            </p>
            <Link href="/" className="text-sm text-primary hover:underline">
              {t("booking.actions.returnHome")}
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 pt-4 mb-6">
        <Link href="/" className="rounded-full p-2 hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">{t("booking.status.title")}</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div
              className={`mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center ${config?.color || ""}`}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{config?.labelKey || status}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("booking.status.reference", { id: bookingId?.slice(0, 8) + "..." })}
              </p>
            </div>
          </div>

          {booking && (
            <div className="bg-muted rounded-lg p-4 mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{booking.patient_name as string}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(
                    ((booking.date as string) || "").split("T")[0] + "T00:00:00"
                  ).toLocaleDateString(locale === "sk" ? "sk-SK" : "en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  {t("booking.status.at")} {booking.start_time as string}
                </span>
              </div>
              {(booking.gdpr_consent as string) && (
                <div className="flex items-center gap-2 text-sm text-status-confirmed">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    GDPR Consent:{" "}
                    {(booking.gdpr_consent as string) === "granted" ? "Granted" : "Not Granted"}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {status && CANCELLABLE_STATUSES.has(status) && (
              <Button
                variant="outline"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                asChild
              >
                <Link href={`/book/${bookingId}/cancel`}>
                  <CalendarX className="h-4 w-4" />
                  {t("patient.status.actions.cancel")}
                </Link>
              </Button>
            )}

            {status === RESCHEDULABLE_STATUS && (
              <Button variant="outline" className="gap-2" asChild>
                <Link href={`/book/${bookingId}/reschedule`}>
                  <CalendarSync className="h-4 w-4" />
                  {t("patient.status.actions.reschedule")}
                </Link>
              </Button>
            )}

            {status === "REJECTED" && (
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/book">
                  <MessageCircle className="h-4 w-4" />
                  {t("patient.status.actions.contactDoctor")}
                </Link>
              </Button>
            )}

            <Button variant="outline" onClick={fetchStatus} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("booking.actions.refresh")}
            </Button>

            {status === "COMPLETED" && (
              <Button asChild>
                <Link href="/book">{t("booking.actions.continue")}</Link>
              </Button>
            )}

            <Link
              href="/"
              className="text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {t("booking.actions.returnHome")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
