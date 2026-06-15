import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { getStripe, STRIPE_CONSULT_AMOUNT, STRIPE_CURRENCY } from "@repo/shared";
import { StripeConnectService } from "./stripe-connect.service";
import { assertPaymentOwnership } from "../common/guards/ownership.helper";
type StripeWebhookEvent = { type: string; data: { object: unknown } };

const PLATFORM_FEE_PERCENT = 20;

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StripeConnectService) private readonly stripeConnectService: StripeConnectService
  ) {}

  async findByBooking(bookingId: string) {
    return this.database.db
      .selectFrom("payment")
      .selectAll()
      .where("booking_id", "=", bookingId)
      .execute();
  }

  async createPayment(data: {
    bookingId: string;
    currency?: string;
    stripePaymentIntentId?: string;
    stripeSetupIntentId?: string;
    stripeCustomerId?: string;
  }) {
    return this.database.db
      .insertInto("payment")
      .values({
        booking_id: data.bookingId,
        amount: STRIPE_CONSULT_AMOUNT,
        currency: data.currency ?? STRIPE_CURRENCY,
        stripe_payment_intent_id: data.stripePaymentIntentId ?? null,
        stripe_setup_intent_id: data.stripeSetupIntentId ?? null,
        stripe_customer_id: data.stripeCustomerId ?? null,
        status: "pending",
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async createSetupIntent(bookingId: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const stripe = getStripe();

    const customer = await stripe.customers.create({
      metadata: { bookingId },
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      metadata: { bookingId },
    });

    await this.database.db
      .insertInto("payment")
      .values({
        booking_id: bookingId,
        stripe_setup_intent_id: setupIntent.id,
        stripe_customer_id: customer.id,
        amount: STRIPE_CONSULT_AMOUNT,
        status: "requires_setup",
        currency: STRIPE_CURRENCY,
      })
      .execute();

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  async confirmSetupIntent(bookingId: string, setupIntentId: string, paymentMethodId: string) {
    const stripe = getStripe();

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    if (setupIntent.status !== "succeeded") {
      throw new BadRequestException("SetupIntent has not been confirmed");
    }

    const customer = setupIntent.customer as string | null;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: STRIPE_CONSULT_AMOUNT,
      currency: STRIPE_CURRENCY,
      customer: customer ?? undefined,
      payment_method: paymentMethodId,
      metadata: { bookingId, setupIntentId },
      capture_method: "manual",
    });

    await this.database.db
      .updateTable("payment")
      .set({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customer,
        status: "requires_capture",
        updated_at: new Date(),
      })
      .where("booking_id", "=", bookingId)
      .where("stripe_setup_intent_id", "=", setupIntentId)
      .execute();

    await this.database.db
      .updateTable("booking")
      .set({ status: "CONFIRMED", updated_at: new Date() })
      .where("id", "=", bookingId)
      .execute();

    const existingCaseFile = await this.database.db
      .selectFrom("case_file")
      .select("id")
      .where("booking_id", "=", bookingId)
      .executeTakeFirst();

    if (!existingCaseFile) {
      const booking = await this.database.db
        .selectFrom("booking")
        .select(["doctor_id", "patient_name", "patient_email"])
        .where("id", "=", bookingId)
        .executeTakeFirst();

      if (booking) {
        await this.database.db
          .insertInto("case_file")
          .values({
            booking_id: bookingId,
            doctor_id: booking.doctor_id,
            patient_name: booking.patient_name,
            patient_email: booking.patient_email,
          })
          .execute();
      }
    }

    return { paymentIntentId: paymentIntent.id, status: "requires_capture" };
  }

  async capturePayment(paymentId: string, doctorId?: string) {
    if (doctorId) await assertPaymentOwnership(this.database, paymentId, doctorId);
    const payment = await this.database.db
      .selectFrom("payment")
      .selectAll()
      .where("id", "=", paymentId)
      .executeTakeFirst();

    if (!payment) throw new NotFoundException("Payment not found");
    if (!payment.stripe_payment_intent_id)
      throw new BadRequestException("No PaymentIntent to capture");

    const stripe = getStripe();

    const intent = await stripe.paymentIntents.capture(
      payment.stripe_payment_intent_id,
      {},
      { idempotencyKey: `capture-${paymentId}` }
    );

    const booking = await this.database.db
      .selectFrom("booking")
      .select(["doctor_id"])
      .where("id", "=", payment.booking_id)
      .executeTakeFirst();

    if (booking) {
      const doctor = await this.database.db
        .selectFrom("doctor")
        .select("stripe_account_id")
        .where("id", "=", booking.doctor_id)
        .executeTakeFirst();

      if (doctor?.stripe_account_id && intent.amount) {
        const platformFee = Math.round(intent.amount * (PLATFORM_FEE_PERCENT / 100));
        const doctorAmount = intent.amount - platformFee;

        try {
          await this.stripeConnectService.createTransfer(
            doctorAmount,
            doctor.stripe_account_id,
            payment.stripe_payment_intent_id
          );
        } catch {
          // transfer failure does not rollback capture
        }
      }
    }

    await this.database.db
      .updateTable("payment")
      .set({
        status: "succeeded",
        captured_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", paymentId)
      .execute();

    await this.database.db
      .updateTable("booking")
      .set({ status: "CAPTURED", updated_at: new Date() })
      .where("id", "=", payment.booking_id)
      .execute();

    return { status: intent.status, capturedAt: new Date() };
  }

  async refundPayment(paymentId: string, amount?: number, doctorId?: string) {
    if (doctorId) await assertPaymentOwnership(this.database, paymentId, doctorId);
    const payment = await this.database.db
      .selectFrom("payment")
      .selectAll()
      .where("id", "=", paymentId)
      .executeTakeFirst();

    if (!payment) throw new NotFoundException("Payment not found");
    if (!payment.stripe_payment_intent_id)
      throw new BadRequestException("No PaymentIntent to refund");

    const stripe = getStripe();

    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id,
        amount: amount ?? undefined,
      },
      { idempotencyKey: `refund-${paymentId}${amount ? `-${amount}` : ""}` }
    );

    await this.database.db
      .updateTable("payment")
      .set({
        status: "refunded",
        refunded_at: new Date(),
        refund_amount: refund.amount,
        updated_at: new Date(),
      })
      .where("id", "=", paymentId)
      .execute();

    return { status: "refunded", refundAmount: refund.amount };
  }

  async voidPayment(paymentId: string, doctorId?: string) {
    if (doctorId) await assertPaymentOwnership(this.database, paymentId, doctorId);
    const payment = await this.database.db
      .selectFrom("payment")
      .selectAll()
      .where("id", "=", paymentId)
      .executeTakeFirst();

    if (!payment) throw new NotFoundException("Payment not found");
    if (!payment.stripe_payment_intent_id)
      throw new BadRequestException("No PaymentIntent to void");

    const stripe = getStripe();

    const intent = await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);

    await this.database.db
      .updateTable("payment")
      .set({
        status: "canceled",
        updated_at: new Date(),
      })
      .where("id", "=", paymentId)
      .execute();

    return { status: intent.status };
  }

  async retryPayment(bookingId: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    if (booking.status !== "PAYMENT_FAILED") {
      throw new BadRequestException("Payment is not in failed state");
    }

    const stripe = getStripe();

    const setupIntent = await stripe.setupIntents.create({
      metadata: { bookingId, retry: "true" },
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  async processStripeWebhook(event: StripeWebhookEvent) {
    switch (event.type) {
      case "account.updated": {
        await this.stripeConnectService.handleAccountUpdated(event);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as { id: string };
        await this.database.db
          .updateTable("payment")
          .set({ status: "succeeded", updated_at: new Date() })
          .where("stripe_payment_intent_id", "=", pi.id)
          .execute();
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as { id: string };
        await this.database.db
          .updateTable("payment")
          .set({ status: "failed", updated_at: new Date() })
          .where("stripe_payment_intent_id", "=", pi.id)
          .execute();
        const payment = await this.database.db
          .selectFrom("payment")
          .select("booking_id")
          .where("stripe_payment_intent_id", "=", pi.id)
          .executeTakeFirst();
        if (payment) {
          await this.database.db
            .updateTable("booking")
            .set({ status: "PAYMENT_FAILED", updated_at: new Date() })
            .where("id", "=", payment.booking_id)
            .execute();
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as {
          payment_intent?: string | { id: string } | null;
          amount_refunded?: number;
          amount?: number;
        };
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (piId) {
          const refundAmount = charge.amount_refunded ?? charge.amount;
          await this.database.db
            .updateTable("payment")
            .set({
              status: "refunded",
              refunded_at: new Date(),
              refund_amount: refundAmount ?? null,
              updated_at: new Date(),
            })
            .where("stripe_payment_intent_id", "=", piId)
            .execute();
        }
        break;
      }
    }
  }
}
