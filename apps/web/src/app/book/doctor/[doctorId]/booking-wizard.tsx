"use client";

import { Button } from "@web/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useBookingState } from "./use-booking-state";
import { StepSlotPicker } from "./step-slot-picker";
import { StepPatientForm } from "./step-patient-form";
import { StepPayment } from "./step-payment";
import { StepConfirm } from "./step-confirm";

export function BookingWizard() {
  const {
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
  } = useBookingState();

  if (step === 3 && bookingId) {
    return (
      <StepConfirm
        bookingStatus={bookingStatus}
        bookingId={bookingId}
        selectedSlot={selectedSlot}
        form={form}
        locale={locale}
        t={t}
      />
    );
  }

  return (
    <main className="min-h-dvh p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pt-4">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("booking.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("booking.stepLabel", { step: step + 1, name: t(`booking.steps.${step}` as const) })}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {errors.submit && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md border border-destructive/20">
          {errors.submit}
        </div>
      )}

      {step === 0 && (
        <StepSlotPicker
          slots={slots}
          loadingSlots={loadingSlots}
          selectedSlot={selectedSlot}
          groupedSlots={groupedSlots}
          onSelect={(slot) => {
            setSelectedSlot(slot);
            if (errors.slot) setErrors({});
          }}
          locale={locale}
          t={t}
        />
      )}

      {step === 1 && (
        <StepPatientForm
          form={form}
          errors={errors}
          returningName={returningName}
          onFieldChange={updateField}
          onEmailBlur={handleEmailBlur}
          t={t}
        />
      )}

      {step === 2 && bookingId && form.paymentMethod === "card" && (
        <StepPayment
          bookingId={bookingId}
          clientSecret={clientSecret}
          setupError={setupError}
          onSuccess={() => setStep(3)}
          onError={(msg) => setErrors({ submit: msg })}
          t={t}
        />
      )}

      <div className="flex justify-between">
        {step === 0 && <div />}
        {step > 0 && step < 3 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            {t("booking.actions.back")}
          </Button>
        )}
        {step === 0 && (
          <Button
            onClick={() => {
              if (!selectedSlot) {
                setErrors({ slot: t("booking.errors.selectSlot") });
                return;
              }
              setErrors({});
              setStep(1);
            }}
          >
            {t("booking.actions.continue")}
          </Button>
        )}
        {step === 1 && (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("booking.actions.submitting")}
              </>
            ) : (
              t("booking.actions.submit")
            )}
          </Button>
        )}
      </div>
    </main>
  );
}
