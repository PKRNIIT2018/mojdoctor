import { inngest } from "../client";
import { getDb } from "../database";
import { canTransition } from "../types";

export const autoExpireBookings = inngest.createFunction(
  { id: "auto-expire-bookings", name: "Auto-Expire Stale Bookings" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const db = getDb();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expired = await step.run("find-expired-bookings", async () => {
      const pending = await db
        .selectFrom("booking")
        .select(["id", "status", "slot_id"])
        .where("status", "=", "PENDING_REVIEW")
        .where("current_state_entered_at", "<", twentyFourHoursAgo)
        .execute();

      const awaitingCard = await db
        .selectFrom("booking")
        .select(["id", "status", "slot_id"])
        .where("status", "=", "AWAITING_CARD")
        .where("current_state_entered_at", "<", twentyFourHoursAgo)
        .execute();

      return [...pending, ...awaitingCard];
    });

    const transitioned = await step.run("expire-bookings", async () => {
      let count = 0;
      for (const booking of expired) {
        if (!canTransition(booking.status, "EXPIRED")) continue;

        const now = new Date();
        await db
          .updateTable("booking")
          .set({ status: "EXPIRED", current_state_entered_at: now, updated_at: now })
          .where("id", "=", booking.id)
          .execute();

        await db
          .updateTable("slot")
          .set({ status: "open", updated_at: now })
          .where("id", "=", booking.slot_id)
          .execute();

        await db
          .insertInto("audit_log")
          .values({
            entity_type: "booking",
            entity_id: booking.id,
            action: `state_change:${booking.status}->EXPIRED`,
            actor_id: "system",
            changes: JSON.stringify({ status: { from: booking.status, to: "EXPIRED" } }),
          })
          .execute();

        count++;
      }
      return count;
    });

    return { expired: transitioned };
  }
);
