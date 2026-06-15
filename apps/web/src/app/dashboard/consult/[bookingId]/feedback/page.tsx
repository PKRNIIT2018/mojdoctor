"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@web/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Loader2, ChevronLeft, Star, MessageSquare, AlertTriangle } from "lucide-react";

type FeedbackItem = {
  id: string;
  booking_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  patient_name?: string;
  patient_email?: string;
};

type FeedbackStats = {
  total: number;
  averageRating: string | null;
  ratedCount: number;
};

export default function FeedbackPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const booking = await api.get<{ doctor_id: string; patient_name: string }>(
          `/api/bookings/${bookingId}`
        );
        setDoctorId(booking.doctor_id);

        const feedbackList = await api.get<FeedbackItem[]>(`/api/feedback/booking/${bookingId}`);
        const fb = feedbackList[0];
        if (fb) {
          setFeedback({ ...fb, patient_name: booking.patient_name });
        }

        const s = await api.get<FeedbackStats>(`/api/feedback/doctor/${booking.doctor_id}/stats`);
        setStats(s);
      } catch {
        setError("Failed to load feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-dvh">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 max-w-lg mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Link
              href={`/dashboard/consult/${bookingId}/summary`}
              className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block"
            >
              &larr; Back to summary
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/consult/${bookingId}/summary`}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Patient Feedback</h1>
          <p className="text-sm text-muted-foreground">Booking #{bookingId.slice(0, 8)}</p>
        </div>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Your Feedback Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.averageRating ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.ratedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Rated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {feedback ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4" />
              Feedback from {feedback.patient_name ?? "Patient"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
            {feedback.rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < feedback.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                  />
                ))}
                <span className="text-sm ml-2 text-muted-foreground">{feedback.rating}/5</span>
              </div>
            )}
            {feedback.comment && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Comment
                </h3>
                <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                  {feedback.comment}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Submitted: {new Date(feedback.created_at).toLocaleString("en-GB")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No feedback yet for this consultation
          </CardContent>
        </Card>
      )}

      <Link
        href={`/dashboard/consult/${bookingId}/summary`}
        className="text-xs text-muted-foreground hover:text-foreground inline-block"
      >
        &larr; Back to summary
      </Link>
    </main>
  );
}
