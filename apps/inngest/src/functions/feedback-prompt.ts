import { inngest } from "../client";
import { getDb } from "../database";
import { sendEmail, FeedbackPromptEmail } from "@repo/email";
import { createOAuth2Client } from "../google-helper";

export const feedbackPrompt = inngest.createFunction(
  { id: "feedback-prompt", name: "Feedback Prompt (24h post-consult)" },
  { cron: "0 10 * * *" },
  async ({ step }) => {
    const db = getDb();

    const result = await step.run("find-and-send-feedback-prompts", async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const bookings = await db
        .selectFrom("booking")
        .innerJoin("doctor", "doctor.id", "booking.doctor_id")
        .leftJoin("feedback", "feedback.booking_id", "booking.id")
        .select([
          "booking.id",
          "booking.patient_name",
          "booking.patient_email",
          "booking.doctor_id",
          "doctor.name as doctor_name",
          "doctor.google_refresh_token",
        ])
        .where("booking.status", "=", "COMPLETED")
        .where("booking.current_state_entered_at", ">=", fortyEightHoursAgo)
        .where("booking.current_state_entered_at", "<=", twentyFourHoursAgo)
        .where("feedback.id", "is", null)
        .execute();

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const sent: { id: string; email: string }[] = [];

      for (const b of bookings) {
        const feedbackUrl = `${appUrl}/feedback/${b.id}`;

        const auth = b.google_refresh_token ? createOAuth2Client(b.google_refresh_token) : null;

        await sendEmail({
          to: b.patient_email,
          subject: "How was your consultation?",
          react: FeedbackPromptEmail({
            patientName: b.patient_name,
            doctorName: b.doctor_name ?? "Your doctor",
            bookingId: b.id,
            feedbackUrl,
          }),
          auth: auth ?? undefined,
        });

        sent.push({ id: b.id, email: b.patient_email });
      }

      return sent;
    });

    return {
      message: `Sent feedback prompts to ${result.length} patients`,
      bookings: result,
    };
  }
);
