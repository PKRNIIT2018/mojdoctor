"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@web/utils/api";
import { useTranslation, detectLocale } from "@web/lib/i18n";

export type Slot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  mode: string;
  status: string;
};

type BookingResponse = {
  booking: { id: string; status: string };
  returningPatient: boolean;
};

export type FormState = {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason: string;
  paymentMethod: string;
  language: string;
  gdprConsent: boolean;
  documentPin: string;
  confirmPin: string;
};

const INITIAL_FORM: FormState = {
  patientName: "",
  patientEmail: "",
  patientPhone: "",
  reason: "",
  paymentMethod: "card",
  language: "en",
  gdprConsent: false,
  documentPin: "",
  confirmPin: "",
};

export function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr.split("T")[0] + "T00:00:00").toLocaleDateString(
    locale === "sk" ? "sk-SK" : "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

export function useBookingState() {
  const params = useParams();
  const doctorId = params.doctorId as string;

  const [locale, setLocale] = useState<"en" | "sk">("en");
  const { t } = useTranslation(locale);

  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [returningName, setReturningName] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const groupedSlots = useMemo(() => {
    return slots.reduce<Record<string, Slot[]>>(
      (acc, slot) => {
        const key = slot.date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(slot);
        return acc;
      },
      {} as Record<string, Slot[]>
    );
  }, [slots]);

  useEffect(() => {
    (async () => {
      try {
        const doctor = await api.get<{ language?: string }>(`/api/doctors/${doctorId}/public`);
        const lang = (doctor.language === "sk" ? "sk" : "en") as "en" | "sk";
        setLocale(lang);
        setForm((f) => ({ ...f, language: lang }));
      } catch {
        setLocale(detectLocale());
      }
    })();
  }, [doctorId]);

  useEffect(() => {
    api
      .get<Slot[]>(`/api/slots/available/${doctorId}`)
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [doctorId]);

  useEffect(() => {
    if (step === 2 && bookingId && !clientSecret) {
      (async () => {
        try {
          const res = await api.post<{ clientSecret: string }>("/api/payments/setup-intent", {
            bookingId,
          });
          setClientSecret(res.clientSecret);
          setSetupError(null);
        } catch {
          setSetupError(t("booking.errors.submitFailed"));
        }
      })();
    }
  }, [step, bookingId, clientSecret, t]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleEmailBlur = useCallback(async () => {
    if (!form.patientEmail) return;
    try {
      const res = await api.get<{ returning: boolean; patientName: string | null }>(
        `/api/bookings/check-patient?email=${encodeURIComponent(form.patientEmail)}`
      );
      if (res.returning && res.patientName) {
        setReturningName(res.patientName);
        setForm((f) => ({ ...f, patientName: res.patientName! }));
      }
    } catch {
      // ignore
    }
  }, [form.patientEmail]);

  const canProceed = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!selectedSlot) errs.slot = t("booking.errors.selectSlot");
    if (!form.patientName.trim()) errs.patientName = t("booking.errors.nameRequired");
    if (!form.patientEmail.trim()) errs.patientEmail = t("booking.errors.emailRequired");
    if (form.gdprConsent !== true) errs.gdprConsent = t("booking.errors.gdprRequired");
    if (form.documentPin && form.documentPin !== form.confirmPin) {
      errs.confirmPin = t("booking.errors.pinMismatch");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [selectedSlot, form, t]);

  const handleSubmit = useCallback(async () => {
    if (!canProceed()) return;
    setSubmitting(true);
    try {
      if (bookingId) {
        await api.patch<{ booking: { id: string; status: string } }>(
          `/api/bookings/${bookingId}/payment-method`,
          { paymentMethod: form.paymentMethod }
        );
        setStep(form.paymentMethod === "card" ? 2 : 3);
      } else {
        const res = await api.post<BookingResponse>("/api/bookings", {
          slotId: selectedSlot!.id,
          doctorId,
          patientName: form.patientName,
          patientEmail: form.patientEmail,
          patientPhone: form.patientPhone || undefined,
          reason: form.reason || undefined,
          paymentMethod: form.paymentMethod,
          language: form.language,
          gdprConsent: form.gdprConsent ? "granted" : "denied",
          documentPin: form.documentPin || undefined,
        });
        setBookingId(res.booking.id);
        setBookingStatus(res.booking.status);
        setStep(form.paymentMethod === "card" ? 2 : 3);
      }
    } catch {
      setErrors({ submit: t("booking.errors.submitFailed") });
    } finally {
      setSubmitting(false);
    }
  }, [canProceed, selectedSlot, doctorId, form, bookingId, t]);

  return {
    doctorId,
    step,
    setStep,
    locale,
    t,
    slots,
    loadingSlots,
    selectedSlot,
    setSelectedSlot,
    form,
    errors,
    setErrors,
    updateField,
    handleEmailBlur,
    bookingId,
    bookingStatus,
    clientSecret,
    setupError,
    groupedSlots,
    submitting,
    returningName,
    handleSubmit,
  };
}
