"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@web/components/ui/card";
import { User, Mail, Phone, FileText, Lock } from "lucide-react";
import { FormState } from "./use-booking-state";

type Props = {
  form: FormState;
  errors: Record<string, string>;
  returningName: string | null;
  onFieldChange: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  onEmailBlur: () => void;
  t: (path: string) => string;
};

export function StepPatientForm({
  form,
  errors,
  returningName,
  onFieldChange,
  onEmailBlur,
  t,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("booking.form.title")}</CardTitle>
        <CardDescription>{t("booking.form.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {t("booking.form.fullName")}
          </label>
          <input
            value={form.patientName}
            onChange={(e) => onFieldChange("patientName", e.target.value)}
            placeholder={t("booking.form.fullNamePlaceholder")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.patientName && <p className="text-xs text-destructive">{errors.patientName}</p>}
          {returningName && (
            <p className="text-xs text-status-confirmed">{t("booking.form.returning")}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t("booking.form.email")}
          </label>
          <input
            value={form.patientEmail}
            onChange={(e) => onFieldChange("patientEmail", e.target.value)}
            onBlur={onEmailBlur}
            type="email"
            placeholder={t("booking.form.emailPlaceholder")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.patientEmail && <p className="text-xs text-destructive">{errors.patientEmail}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {t("booking.form.phone")}
          </label>
          <input
            value={form.patientPhone}
            onChange={(e) => onFieldChange("patientPhone", e.target.value)}
            type="tel"
            placeholder={t("booking.form.phonePlaceholder")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {t("booking.form.reason")}
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => onFieldChange("reason", e.target.value)}
            placeholder={t("booking.form.reasonPlaceholder")}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {t("booking.form.docPin")}
          </label>
          <p className="text-xs text-muted-foreground">{t("booking.form.docPinHint")}</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.documentPin}
              onChange={(e) =>
                onFieldChange("documentPin", e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={t("booking.form.pinPlaceholder")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              value={form.confirmPin}
              onChange={(e) =>
                onFieldChange("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={t("booking.form.confirmPinPlaceholder")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {errors.confirmPin && <p className="text-xs text-destructive">{errors.confirmPin}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t("booking.form.paymentMethod")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onFieldChange("paymentMethod", "card")}
              className={`p-3 rounded-lg border text-left transition-all ${
                form.paymentMethod === "card"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="text-sm font-medium">{t("booking.form.card")}</div>
              <div className="text-xs text-muted-foreground">{t("booking.form.cardHint")}</div>
            </button>
            <button
              onClick={() => onFieldChange("paymentMethod", "other")}
              className={`p-3 rounded-lg border text-left transition-all ${
                form.paymentMethod === "other"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="text-sm font-medium">{t("booking.form.other")}</div>
              <div className="text-xs text-muted-foreground">{t("booking.form.otherHint")}</div>
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
          <input
            type="checkbox"
            id="gdpr"
            checked={form.gdprConsent}
            onChange={(e) => onFieldChange("gdprConsent", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <div>
            <label htmlFor="gdpr" className="text-sm font-medium text-foreground">
              {t("booking.form.gdpr")}
            </label>
            <p className="text-xs text-muted-foreground mt-1">{t("booking.form.gdprText")}</p>
          </div>
        </div>
        {errors.gdprConsent && <p className="text-xs text-destructive">{errors.gdprConsent}</p>}
      </CardContent>
    </Card>
  );
}
