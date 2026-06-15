import { inngest } from "../client";
import { getDb } from "../database";
import { canTransition } from "../types";

export const expirePatientReschedules = inngest.createFunction(
  { id: "expire-patient-reschedules", name: "Auto-Cancel Stale Reschedule Requests" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const db = getDb();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const stale = await step.run("find-stale-reschedules", async () => {
      return db
        .selectFrom("booking")
        .select(["id", "status"])
        .where("status", "=", "AWAITING_PATIENT_RESCHEDULE")
        .where("current_state_entered_at", "<", fortyEightHoursAgo)
        .execute();
    });

    const cancelled = await step.run("cancel-stale-reschedules", async () => {
      let count = 0;
      for (const booking of stale) {
        if (!canTransition(booking.status, "CANCELLED_BY_PATIENT")) continue;

        const now = new Date();
        await db
          .updateTable("booking")
          .set({ status: "CANCELLED_BY_PATIENT", current_state_entered_at: now, updated_at: now })
          .where("id", "=", booking.id)
          .execute();

        await db
          .insertInto("audit_log")
          .values({
            entity_type: "booking",
            entity_id: booking.id,
            action: `state_change:${booking.status}->CANCELLED_BY_PATIENT`,
            actor_id: "system",
            changes: JSON.stringify({
              status: { from: booking.status, to: "CANCELLED_BY_PATIENT" },
            }),
          })
          .execute();

        count++;
      }
      return count;
    });

    return { cancelled };
  }
);
