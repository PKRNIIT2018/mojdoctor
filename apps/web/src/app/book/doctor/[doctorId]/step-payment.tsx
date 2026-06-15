"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "@web/utils/api";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({
  bookingId,
  t,
  onSuccess,
  onError,
}: {
  bookingId: string;
  t: (path: string) => string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error: submitError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      onError(submitError.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    if (!setupIntent?.payment_method) {
      onError("No payment method returned");
      setProcessing(false);
      return;
    }

    try {
      await api.post("/api/payments/confirm-setup", {
        bookingId,
        setupIntentId: setupIntent.id,
        paymentMethodId: setupIntent.payment_method,
      });
      onSuccess();
    } catch {
      onError("Failed to confirm payment setup");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || processing}>
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("booking.payment.processing")}
          </>
        ) : (
          t("booking.payment.complete")
        )}
      </Button>
    </form>
  );
}

type Props = {
  bookingId: string;
  clientSecret: string | null;
  setupError: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
  t: (path: string) => string;
};

export function StepPayment({ bookingId, clientSecret, setupError, onSuccess, onError, t }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("booking.payment.title")}</CardTitle>
        <CardDescription>{t("booking.payment.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">{t("booking.payment.info")}</p>
        </div>

        {setupError && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md border border-destructive/20 flex items-start gap-2">
            <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{setupError}</span>
          </div>
        )}

        {!clientSecret ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm bookingId={bookingId} t={t} onSuccess={onSuccess} onError={onError} />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
}
