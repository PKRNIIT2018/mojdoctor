import { inngest } from "../client";
import { getDb } from "../database";
import { sendEmail, DailyAgendaEmail } from "@repo/email";
import { createOAuth2Client } from "../google-helper";

export const dailyAgenda = inngest.createFunction(
  { id: "daily-agenda", name: "Daily Agenda Email" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    const db = getDb();

    const doctors = await step.run("get-doctors", async () => {
      return db
        .selectFrom("doctor")
        .select(["id", "email", "name", "notification_prefs", "google_refresh_token"])
        .execute();
    });

    const results = await step.run("generate-and-send-agendas", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dateStr = today.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const sent: { email: string; bookingCount: number }[] = [];

      for (const doctor of doctors) {
        const prefs = doctor.notification_prefs as { dailyAgendaTime?: string } | null;
        if (prefs?.dailyAgendaTime === undefined) continue;

        const bookings = await db
          .selectFrom("booking")
          .innerJoin("slot", "slot.id", "booking.slot_id")
          .select(["booking.patient_name", "slot.start_time", "slot.end_time", "slot.mode"])
          .where("booking.doctor_id", "=", doctor.id)
          .where("booking.status", "in", ["CONFIRMED", "CAPTURED"])
          .where("slot.date", ">=", today)
          .where("slot.date", "<", tomorrow)
          .orderBy("slot.start_time", "asc")
          .execute();

        if (bookings.length === 0) continue;

        const auth = doctor.google_refresh_token
          ? createOAuth2Client(doctor.google_refresh_token)
          : null;

        await sendEmail({
          to: doctor.email,
          subject: `Today's Agenda - ${bookings.length} appointment${bookings.length !== 1 ? "s" : ""}`,
          react: DailyAgendaEmail({
            doctorName: doctor.name ?? "Doctor",
            date: dateStr,
            appointments: bookings.map((b) => ({
              time: b.start_time,
              patientName: b.patient_name,
              mode: b.mode,
            })),
          }),
          auth: auth ?? undefined,
        });

        sent.push({ email: doctor.email, bookingCount: bookings.length });
      }

      return sent;
    });

    return {
      message: `Sent daily agendas to ${results.length} doctors`,
      doctors: results,
    };
  }
);
