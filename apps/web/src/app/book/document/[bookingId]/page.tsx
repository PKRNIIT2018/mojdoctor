"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@web/components/ui/input-otp";
import { api } from "@web/utils/api";
import { useTranslation } from "@web/lib/i18n";
import { useLocale } from "@web/hooks/use-locale";
import { Loader2, FileText, Lock, AlertTriangle, Pill, ScrollText } from "lucide-react";

interface DocumentData {
  valid: boolean;
  summary: string | null;
  prescriptions: Array<{
    medicationName: string;
    dosage: string;
    instructions: string | null;
    validUntil: string | null;
    createdAt: string;
  }>;
}

export default function PatientDocumentViewerPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const locale = useLocale();
  const { t } = useTranslation(locale);

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentData | null>(null);
  const [attempts, setAttempts] = useState(5);

  const handleVerify = async () => {
    if (pin.length !== 4) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<DocumentData>(`/api/bookings/${bookingId}/verify-document-pin`, {
        pin,
      });
      if (!res.valid) {
        setAttempts((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setError(t("patient.document.errorLocked"));
          } else {
            setError(t("patient.document.errorWrongPin", { attempts: String(next) }));
          }
          setPin("");
          return next;
        });
      } else {
        setData(res as DocumentData);
      }
    } catch {
      setError(t("patient.status.actions.notFound"));
    } finally {
      setSubmitting(false);
    }
  };

  if (data) {
    const hasContent = data.summary || data.prescriptions.length > 0;
    return (
      <main className="min-h-dvh p-4 py-8">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t("patient.document.title")}</h1>
          </div>

          {!hasContent && (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("patient.document.noDocuments")}</p>
              </CardContent>
            </Card>
          )}

          {data.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScrollText className="h-4 w-4 text-primary" />
                  {t("patient.document.summaryTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {data.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {data.prescriptions.map((rx, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="h-4 w-4 text-primary" />
                  {t("patient.document.prescriptionTitle")} #{i + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Medication</dt>
                    <dd className="font-medium text-foreground">{rx.medicationName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Dosage</dt>
                    <dd className="font-medium text-foreground">{rx.dosage}</dd>
                  </div>
                  {rx.instructions && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Instructions</dt>
                      <dd className="font-medium text-foreground text-right max-w-[60%]">
                        {rx.instructions}
                      </dd>
                    </div>
                  )}
                  {rx.validUntil && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Valid until</dt>
                      <dd className="font-medium text-foreground">
                        {new Date(rx.validUntil).toLocaleDateString(
                          locale === "sk" ? "sk-SK" : "en-GB",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}

          <div className="text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              {t("booking.actions.returnHome")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t("patient.document.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("patient.document.pinHint")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-center text-foreground">
              {t("patient.document.pinLabel")}
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={setPin}
                onComplete={handleVerify}
                disabled={submitting || attempts <= 0}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={pin.length !== 4 || submitting || attempts <= 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("patient.document.submitBtn")
            )}
          </Button>

          <div className="text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              {t("booking.actions.returnHome")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
