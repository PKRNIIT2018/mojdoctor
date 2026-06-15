import { Injectable, BadRequestException, NotFoundException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { getStripe } from "@repo/shared";
type AccountUpdatedEvent = { type: string; data: { object: unknown } };

@Injectable()
export class StripeConnectService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async createAccount(doctorId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select(["id", "email", "name", "stripe_account_id"])
      .where("id", "=", doctorId)
      .executeTakeFirst();

    if (!doctor) throw new NotFoundException("Doctor not found");
    if (doctor.stripe_account_id) {
      return { accountId: doctor.stripe_account_id, alreadyExists: true };
    }

    const stripe = getStripe();

    const account = await stripe.accounts.create({
      type: "express",
      email: doctor.email,
      business_type: "individual",
      metadata: { doctorId },
    });

    await this.database.db
      .updateTable("doctor")
      .set({ stripe_account_id: account.id, updated_at: new Date() })
      .where("id", "=", doctorId)
      .execute();

    return { accountId: account.id, alreadyExists: false };
  }

  async createAccountLink(doctorId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("stripe_account_id")
      .where("id", "=", doctorId)
      .executeTakeFirst();

    if (!doctor) throw new NotFoundException("Doctor not found");
    if (!doctor.stripe_account_id) {
      throw new BadRequestException("Doctor has no Stripe Connect account. Create one first.");
    }

    const stripe = getStripe();
    const base = process.env.APP_URL ?? "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: doctor.stripe_account_id,
      refresh_url: `${base}/doctor/stripe/refresh`,
      return_url: `${base}/doctor/stripe/return`,
      type: "account_onboarding",
    });

    return { url: accountLink.url, expiresAt: accountLink.expires_at };
  }

  async getStatus(doctorId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select(["stripe_account_id", "stripe_onboarded"])
      .where("id", "=", doctorId)
      .executeTakeFirst();

    if (!doctor) throw new NotFoundException("Doctor not found");

    if (!doctor.stripe_account_id) {
      return { connected: false, onboarded: false };
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(doctor.stripe_account_id);

    return {
      connected: true,
      accountId: doctor.stripe_account_id,
      onboarded: doctor.stripe_onboarded,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: {
        currentlyDue: account.requirements?.currently_due ?? [],
        eventuallyDue: account.requirements?.eventually_due ?? [],
        pastDue: account.requirements?.past_due ?? [],
      },
    };
  }

  async handleAccountUpdated(event: AccountUpdatedEvent) {
    const account = event.data.object as {
      id: string;
      metadata?: Record<string, string>;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
    };
    const doctorId = account.metadata?.doctorId;

    if (!doctorId) {
      const doctor = await this.database.db
        .selectFrom("doctor")
        .select("id")
        .where("stripe_account_id", "=", account.id)
        .executeTakeFirst();
      if (!doctor) return;
    }

    const id = doctorId || (await this.getDoctorIdByAccountId(account.id));
    if (!id) return;

    const onboarded =
      account.charges_enabled && account.payouts_enabled && account.details_submitted;

    await this.database.db
      .updateTable("doctor")
      .set({
        stripe_onboarded: onboarded,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .execute();
  }

  async createTransfer(amount: number, doctorStripeAccountId: string, paymentIntentId: string) {
    const stripe = getStripe();

    const transfer = await stripe.transfers.create({
      amount,
      currency: "eur",
      destination: doctorStripeAccountId,
      source_transaction: paymentIntentId,
    });

    return { transferId: transfer.id, amount: transfer.amount };
  }

  private async getDoctorIdByAccountId(accountId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("stripe_account_id", "=", accountId)
      .executeTakeFirst();
    return doctor?.id ?? null;
  }
}
