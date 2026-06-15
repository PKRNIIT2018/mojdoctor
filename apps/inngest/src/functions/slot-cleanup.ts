import { inngest } from "../client";
import { getDb } from "../database";

export const cleanupPastSlots = inngest.createFunction(
  { id: "cleanup-past-slots", name: "Clean Up Past Slots" },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const db = getDb();

    const count = await step.run("close-past-slots", async () => {
      const result = await db
        .updateTable("slot")
        .set({ status: "closed", updated_at: new Date() })
        .where("status", "in", ["open", "held"])
        .where("date", "<", new Date())
        .execute();

      return result.length ?? 0;
    });

    return { closed: count };
  }
);
