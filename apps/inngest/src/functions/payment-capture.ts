import { inngest } from "../client";
import { getDb } from "../database";
import { getStripe } from "@repo/shared";

export const capturePayments = inngest.createFunction(
  { id: "capture-payments", name: "Capture Payments on Consult Day" },
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const db = getDb();

    const bookingsToCapture = await step.run("find-bookings-to-capture", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      return db
        .selectFrom("booking")
        .innerJoin("slot", "slot.id", "booking.slot_id")
        .innerJoin("payment", "payment.booking_id", "booking.id")
        .select([
          "booking.id as booking_id",
          "payment.id as payment_id",
          "booking.patient_name",
          "booking.patient_email",
          "payment.stripe_payment_intent_id",
          "payment.amount",
          "slot.start_time",
        ])
        .where("booking.status", "=", "CONFIRMED")
        .where("slot.date", ">=", today)
        .where("slot.date", "<=", endOfToday)
        .where("payment.stripe_payment_intent_id", "is not", null)
        .where("payment.status", "=", "requires_capture")
        .execute();
    });

    const results = await step.run("capture-payments", async () => {
      const captured: string[] = [];
      const failed: { id: string; reason: string }[] = [];

      for (const booking of bookingsToCapture) {
        if (!booking.stripe_payment_intent_id) {
          failed.push({ id: booking.booking_id, reason: "No payment intent ID" });
          continue;
        }

        try {
          const stripe = getStripe();
          await stripe.paymentIntents.capture(
            booking.stripe_payment_intent_id,
            {},
            { idempotencyKey: `capture-${booking.payment_id}` }
          );

          const now = new Date();
          await db
            .updateTable("payment")
            .set({ status: "captured", captured_at: now, updated_at: now })
            .where("id", "=", booking.payment_id)
            .execute();

          await db
            .updateTable("booking")
            .set({ status: "CAPTURED", current_state_entered_at: now, updated_at: now })
            .where("id", "=", booking.booking_id)
            .execute();

          await db
            .insertInto("audit_log")
            .values({
              entity_type: "booking",
              entity_id: booking.booking_id,
              action: "state_change:CONFIRMED->CAPTURED",
              actor_id: "system",
              changes: JSON.stringify({ status: { from: "CONFIRMED", to: "CAPTURED" } }),
            })
            .execute();

          captured.push(booking.booking_id);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          failed.push({ id: booking.booking_id, reason: errorMsg });

          const now = new Date();
          await db
            .updateTable("booking")
            .set({ status: "PAYMENT_FAILED", current_state_entered_at: now, updated_at: now })
            .where("id", "=", booking.booking_id)
            .execute();

          await db
            .updateTable("payment")
            .set({ status: "failed", updated_at: now })
            .where("booking_id", "=", booking.booking_id)
            .execute();

          await db
            .insertInto("audit_log")
            .values({
              entity_type: "booking",
              entity_id: booking.booking_id,
              action: "state_change:CONFIRMED->PAYMENT_FAILED",
              actor_id: "system",
              changes: JSON.stringify({
                status: { from: "CONFIRMED", to: "PAYMENT_FAILED" },
                error: errorMsg,
              }),
            })
            .execute();
        }
      }

      return { captured, failed };
    });

    return {
      captured: results.captured.length,
      failed: results.failed.length,
      details: results,
    };
  }
);
