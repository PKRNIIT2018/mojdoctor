"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { CreditCard, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "@web/utils/api";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentForm({
  bookingId,
  onSuccess,
  onError,
}: {
  bookingId: string;
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
            Processing...
          </>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
}

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [status, setStatus] = useState<string | null>(null);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ status: string }>(`/api/bookings/${bookingId}/status`);
        setStatus(res.status);

        if (res.status === "NOT_FOUND") {
          setNotFound(true);
          return;
        }

        const full = await api.get<Record<string, unknown>>(`/api/bookings/${bookingId}`);
        setBooking(full);

        if (res.status === "AWAITING_CARD") {
          const setup = await api.post<{ clientSecret: string }>("/api/payments/setup-intent", {
            bookingId,
          });
          setClientSecret(setup.clientSecret);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

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
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold">Booking Not Found</h1>
            <p className="text-sm text-muted-foreground">
              This booking could not be found. The link may be invalid or expired.
            </p>
            <Link href="/" className="text-sm text-primary hover:underline">
              Return Home
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold">Payment Complete</h1>
            <p className="text-sm text-muted-foreground">
              Your card has been pre-authorised and your booking is confirmed.
            </p>
            <Button asChild>
              <Link href={`/book/status/${bookingId}`}>View Booking Status</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (status !== "AWAITING_CARD") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold">No Payment Required</h1>
            <p className="text-sm text-muted-foreground">
              This booking does not require payment or has already been processed.
            </p>
            <Button asChild>
              <Link href={`/book/status/${bookingId}`}>View Booking Status</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 max-w-md mx-auto">
      <Link
        href={`/book/status/${bookingId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Booking
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Enter your card details to pre-authorise the consultation fee. Your card will be charged
            on the day of your appointment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {booking && (
            <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
              <p>
                <strong>Patient:</strong> {booking.patient_name as string}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(
                  ((booking.date as string) || "").split("T")[0] + "T00:00:00"
                ).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p>
                <strong>Time:</strong> {booking.start_time as string}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md border border-destructive/20 flex items-start gap-2">
              <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              <PaymentForm
                bookingId={bookingId}
                onSuccess={() => setSuccess(true)}
                onError={setError}
              />
            </Elements>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
