import { inngest } from "../client";
import { getDb } from "../database";
import { canTransition } from "../types";

export const detectNoShows = inngest.createFunction(
  { id: "detect-no-shows", name: "Detect No-Show Appointments" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const db = getDb();

    const potentialNoShows = await step.run("find-potential-no-shows", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      return db
        .selectFrom("booking")
        .innerJoin("slot", "slot.id", "booking.slot_id")
        .select(["booking.id", "booking.slot_id", "booking.status", "slot.date", "slot.end_time"])
        .where("booking.status", "in", ["CONFIRMED", "CAPTURED"])
        .where("slot.date", "<=", endOfToday)
        .execute();
    });

    const filtered = potentialNoShows.filter((b) => {
      const slotEnd = new Date(b.date);
      const [hours, minutes] = b.end_time.split(":").map(Number);
      slotEnd.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const threshold = slotEnd.getTime() + 30 * 60 * 1000;
      return Date.now() >= threshold;
    });

    const result = await step.run("mark-no-shows", async () => {
      let count = 0;
      for (const booking of filtered) {
        if (!canTransition(booking.status, "NO_SHOW")) continue;

        const now = new Date();
        await db
          .updateTable("booking")
          .set({ status: "NO_SHOW", current_state_entered_at: now, updated_at: now })
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
            action: `state_change:${booking.status}->NO_SHOW`,
            actor_id: "system",
            changes: JSON.stringify({ status: { from: booking.status, to: "NO_SHOW" } }),
          })
          .execute();

        count++;
      }
      return count;
    });

    return { marked_as_no_show: result };
  }
);
