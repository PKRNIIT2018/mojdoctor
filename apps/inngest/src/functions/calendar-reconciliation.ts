import { google } from "googleapis";
import { inngest } from "../client";
import { getDb } from "../database";
import { createOAuth2Client } from "../google-helper";

function toDateStr(date: unknown): string {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
}

const TERMINAL_AND_CANCELLED = [
  "REJECTED",
  "EXPIRED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "COMPLETED",
  "NO_SHOW",
] as const;

export const calendarReconciliation = inngest.createFunction(
  {
    id: "calendar-reconciliation",
    name: "Calendar Event Reconciliation",
  },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const db = getDb();

    const bookingsMissingEvents = await step.run(
      "find-confirmed-bookings-missing-calendar-events",
      async () => {
        return db
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
            "slot.end_time",
          ])
          .where("booking.status", "=", "CONFIRMED")
          .where("booking.calendar_event_id", "is", null)
          .execute();
      }
    );

    const bookingsWithOrphanedEvents = await step.run(
      "find-terminal-bookings-with-calendar-events",
      async () => {
        return db
          .selectFrom("booking")
          .innerJoin("doctor", "doctor.id", "booking.doctor_id")
          .select([
            "booking.id",
            "booking.calendar_event_id",
            "booking.status",
            "booking.doctor_id",
            "doctor.google_refresh_token",
          ])
          .where("booking.calendar_event_id", "is not", null)
          .where("booking.status", "in", TERMINAL_AND_CANCELLED as unknown as string[])
          .execute();
      }
    );

    const createResults = await step.run("create-missing-calendar-events", async () => {
      let succeeded = 0;
      let failed = 0;

      const byDoctor = new Map<string, typeof bookingsMissingEvents>();
      for (const booking of bookingsMissingEvents) {
        const list = byDoctor.get(booking.doctor_id) ?? [];
        list.push(booking);
        byDoctor.set(booking.doctor_id, list);
      }

      for (const [doctorId, bookings] of byDoctor) {
        const refreshToken = bookings[0]?.google_refresh_token;
        if (!refreshToken) {
          failed += bookings.length;
          continue;
        }

        const auth = createOAuth2Client(refreshToken);
        if (!auth) {
          failed += bookings.length;
          continue;
        }

        const calendar = google.calendar({ version: "v3", auth });

        for (const booking of bookings) {
          try {
            const dateStr = toDateStr(booking.date);

            const response = await calendar.events.insert({
              calendarId: "primary",
              requestBody: {
                summary: "Medical Consultation",
                description: `Consultation with ${booking.patient_name}`,
                start: { dateTime: `${dateStr}T${booking.start_time}` },
                end: { dateTime: `${dateStr}T${booking.end_time}` },
                attendees: [{ email: booking.patient_email }],
                conferenceData: {
                  createRequest: {
                    requestId: crypto.randomUUID(),
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                  },
                },
              },
              conferenceDataVersion: 1,
            });

            const event = response.data;
            const meetUrl = (event as any).hangoutLink ?? null;

            const now = new Date();
            await db
              .updateTable("booking")
              .set({
                calendar_event_id: event.id ?? null,
                video_room_url: meetUrl ?? booking.video_room_url,
                updated_at: now,
              })
              .where("id", "=", booking.id)
              .execute();

            await db
              .insertInto("audit_log")
              .values({
                entity_type: "booking",
                entity_id: booking.id,
                action: "calendar_reconciliation:event_created",
                actor_id: "system",
                changes: JSON.stringify({
                  calendar_event_id: {
                    from: null,
                    to: event.id,
                  },
                  video_room_url: {
                    from: booking.video_room_url,
                    to: meetUrl,
                  },
                }),
              })
              .execute();

            succeeded++;
          } catch (err) {
            failed++;

            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            await db
              .insertInto("audit_log")
              .values({
                entity_type: "booking",
                entity_id: booking.id,
                action: "calendar_reconciliation:event_creation_failed",
                actor_id: "system",
                changes: JSON.stringify({ error: errorMsg }),
              })
              .execute();
          }
        }
      }

      return {
        attempted: bookingsMissingEvents.length,
        succeeded,
        failed,
        skipped: 0,
      };
    });

    const deleteResults = await step.run("delete-orphaned-calendar-events", async () => {
      let succeeded = 0;
      let failed = 0;

      const byDoctor = new Map<string, typeof bookingsWithOrphanedEvents>();
      for (const booking of bookingsWithOrphanedEvents) {
        const list = byDoctor.get(booking.doctor_id) ?? [];
        list.push(booking);
        byDoctor.set(booking.doctor_id, list);
      }

      for (const [doctorId, bookings] of byDoctor) {
        const refreshToken = bookings[0]?.google_refresh_token;
        if (!refreshToken) {
          failed += bookings.length;
          continue;
        }

        const auth = createOAuth2Client(refreshToken);
        if (!auth) {
          failed += bookings.length;
          continue;
        }

        const calendar = google.calendar({ version: "v3", auth });

        for (const booking of bookings) {
          if (!booking.calendar_event_id) continue;

          try {
            await calendar.events.delete({
              calendarId: "primary",
              eventId: booking.calendar_event_id,
            });

            const now = new Date();
            await db
              .updateTable("booking")
              .set({ calendar_event_id: null, updated_at: now })
              .where("id", "=", booking.id)
              .execute();

            await db
              .insertInto("audit_log")
              .values({
                entity_type: "booking",
                entity_id: booking.id,
                action: "calendar_reconciliation:event_deleted",
                actor_id: "system",
                changes: JSON.stringify({
                  calendar_event_id: {
                    from: booking.calendar_event_id,
                    to: null,
                  },
                  status: { from: booking.status, to: booking.status },
                }),
              })
              .execute();

            succeeded++;
          } catch (err) {
            failed++;

            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            await db
              .insertInto("audit_log")
              .values({
                entity_type: "booking",
                entity_id: booking.id,
                action: "calendar_reconciliation:event_deletion_failed",
                actor_id: "system",
                changes: JSON.stringify({ error: errorMsg }),
              })
              .execute();
          }
        }
      }

      return {
        attempted: bookingsWithOrphanedEvents.length,
        succeeded,
        failed,
        skipped: 0,
      };
    });

    return {
      bookingsMissingEvents: bookingsMissingEvents.length,
      bookingsWithOrphanedEvents: bookingsWithOrphanedEvents.length,
      eventsCreated: createResults.succeeded,
      creationErrors: createResults.failed,
      eventsDeleted: deleteResults.succeeded,
      deletionErrors: deleteResults.failed,
    };
  }
);
