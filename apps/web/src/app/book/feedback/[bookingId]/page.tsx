"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { api } from "@web/utils/api";
import { useTranslation, detectLocale } from "@web/lib/i18n";
import { Loader2, Star, MessageSquare, CheckCircle, AlertTriangle, Send } from "lucide-react";

export default function PatientFeedbackPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const [locale, setLocale] = useState<"en" | "sk">("en");
  const { t } = useTranslation(locale);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  useEffect(() => {
    setLocale(detectLocale());
    (async () => {
      try {
        await api.get(`/api/bookings/${bookingId}`);
      } catch {
        setError(t("patient.status.actions.notFound"));
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, t]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/feedback", {
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      setDone(true);
    } catch {
      setError(t("patient.feedback.errorFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-status-confirmed/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-status-confirmed" />
            </div>
            <CardTitle>{t("patient.feedback.submittedTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("patient.feedback.submittedText")}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild>
                <Link href="/book">{t("patient.feedback.followUpCta")}</Link>
              </Button>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                {t("booking.actions.returnHome")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error && !bookingId) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" asChild>
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
            <Star className="h-5 w-5 text-amber-500" />
            {t("patient.feedback.title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("patient.feedback.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t("patient.feedback.ratingLabel")}
            </p>
            <div className="flex gap-1 justify-center" role="radiogroup">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={star <= rating}
                  aria-label={`${star} star${star !== 1 ? "s" : ""} out of 5`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredStar || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {rating <= 2 ? "😟 " : rating === 3 ? "😐 " : "😊 "}
                {rating}/5
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {t("patient.feedback.commentLabel")}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("patient.feedback.commentPlaceholder")}
              rows={4}
              maxLength={2000}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/2000</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("patient.feedback.submitBtn")}
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
