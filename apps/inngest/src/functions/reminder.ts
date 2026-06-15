import { inngest } from "../client";
import { getDb } from "../database";
import { sendEmail, ReminderEmail } from "@repo/email";
import { createOAuth2Client } from "../google-helper";

export const patientReminder = inngest.createFunction(
  { id: "patient-reminder", name: "Patient Reminder (24h before)" },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    const db = getDb();

    const result = await step.run("find-and-send-reminders", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const bookings = await db
        .selectFrom("booking")
        .innerJoin("slot", "slot.id", "booking.slot_id")
        .innerJoin("doctor", "doctor.id", "booking.doctor_id")
        .select([
          "booking.id",
          "booking.patient_name",
          "booking.patient_email",
          "booking.video_room_url",
          "booking.doctor_id",
          "doctor.google_refresh_token",
          "slot.date",
          "slot.start_time",
          "slot.mode",
        ])
        .where("booking.status", "in", ["CONFIRMED", "CAPTURED"])
        .where("slot.date", ">=", tomorrow)
        .where("slot.date", "<", dayAfter)
        .execute();

      const sent: { id: string; email: string }[] = [];

      for (const b of bookings) {
        const dateStr =
          b.date instanceof Date
            ? b.date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : new Date(b.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });

        const auth = b.google_refresh_token ? createOAuth2Client(b.google_refresh_token) : null;

        await sendEmail({
          to: b.patient_email,
          subject: "Reminder: Your consultation is tomorrow",
          react: ReminderEmail({
            patientName: b.patient_name,
            date: dateStr,
            time: b.start_time,
            mode: b.mode,
            bookingId: b.id,
            videoRoomUrl: b.video_room_url ?? undefined,
          }),
          auth: auth ?? undefined,
        });

        sent.push({ id: b.id, email: b.patient_email });
      }

      return sent;
    });

    return {
      message: `Sent reminders to ${result.length} patients`,
      bookings: result,
    };
  }
);
