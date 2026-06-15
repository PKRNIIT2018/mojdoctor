import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { PaymentService } from "../payment.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

const mockStripe = vi.hoisted(() => ({
  customers: { create: vi.fn() },
  setupIntents: { create: vi.fn(), retrieve: vi.fn() },
  paymentIntents: { create: vi.fn(), capture: vi.fn(), cancel: vi.fn() },
  refunds: { create: vi.fn() },
  accounts: { create: vi.fn(), retrieve: vi.fn() },
  accountLinks: { create: vi.fn() },
  transfers: { create: vi.fn() },
}));

const mockStripeConnectService = vi.hoisted(() => ({
  createAccount: vi.fn(),
  createAccountLink: vi.fn(),
  getStatus: vi.fn(),
  handleAccountUpdated: vi.fn(),
  createTransfer: vi.fn(),
}));

vi.mock("@repo/shared", () => ({
  getStripe: () => mockStripe,
  STRIPE_CONSULT_AMOUNT: 5000,
  STRIPE_CURRENCY: "eur",
}));

vi.mock("../stripe-connect.service", () => ({
  StripeConnectService: vi.fn(() => mockStripeConnectService),
}));

function createMockDb() {
  const builder = {
    selectFrom: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
    execute: vi.fn(),
    updateTable: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn(),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orWhere: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
    whereRef: vi.fn().mockReturnThis(),
  };
  return builder;
}

describe("PaymentService", () => {
  let service: PaymentService;
  let db: ReturnType<typeof createMockDb>;

  const mockBooking = {
    id: "booking-1",
    slot_id: "slot-1",
    doctor_id: "doc-1",
    patient_name: "John Doe",
    patient_email: "john@example.com",
    status: "PENDING_REVIEW",
    video_room_url: null,
    payment_method: "stripe",
    language: "en",
    gdpr_consent: "granted",
    created_at: new Date(),
    updated_at: new Date(),
    reason: null,
    patient_phone: null,
  };

  const mockPayment = {
    id: "payment-1",
    booking_id: "booking-1",
    amount: 5000,
    currency: "eur",
    status: "pending",
    stripe_payment_intent_id: "pi_mock",
    stripe_setup_intent_id: "seti_mock",
    stripe_customer_id: "cus_mock",
    refund_amount: null,
    captured_at: null,
    refunded_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    service = new PaymentService(
      { db: db as never, onModuleDestroy: vi.fn() } as never,
      mockStripeConnectService as never
    );
  });

  describe("createSetupIntent", () => {
    it("should throw NotFoundException when booking not found", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(undefined);

      await expect(service.createSetupIntent("invalid")).rejects.toThrow(NotFoundException);
    });

    it("should create a setup intent and return client secret", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(mockBooking);
      mockStripe.customers.create.mockResolvedValue({
        id: "cus_mock",
      });
      mockStripe.setupIntents.create.mockResolvedValue({
        id: "seti_mock",
        client_secret: "seti_mock_secret",
      });

      const result = await service.createSetupIntent("booking-1");

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        metadata: { bookingId: "booking-1" },
      });
      expect(mockStripe.setupIntents.create).toHaveBeenCalledWith({
        customer: "cus_mock",
        metadata: { bookingId: "booking-1" },
      });
      expect(result).toEqual({
        clientSecret: "seti_mock_secret",
        setupIntentId: "seti_mock",
      });
    });
  });

  describe("confirmSetupIntent", () => {
    it("should throw BadRequestException when setup intent not succeeded", async () => {
      mockStripe.setupIntents.retrieve.mockResolvedValue({ status: "canceled" });

      await expect(service.confirmSetupIntent("booking-1", "seti_mock", "pm_mock")).rejects.toThrow(
        BadRequestException
      );
    });

    it("should create payment intent and update records on success", async () => {
      mockStripe.setupIntents.retrieve.mockResolvedValue({
        status: "succeeded",
        customer: "cus_mock",
      });
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_mock_2",
      });

      const result = await service.confirmSetupIntent("booking-1", "seti_mock", "pm_mock");

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: "eur",
        customer: "cus_mock",
        payment_method: "pm_mock",
        metadata: { bookingId: "booking-1", setupIntentId: "seti_mock" },
        capture_method: "manual",
      });
      expect(result).toEqual({ paymentIntentId: "pi_mock_2", status: "requires_capture" });
    });
  });

  describe("capturePayment", () => {
    it("should throw NotFoundException when payment not found", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(undefined);

      await expect(service.capturePayment("invalid")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when no stripe PaymentIntent", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue({
        ...mockPayment,
        stripe_payment_intent_id: null,
      });

      await expect(service.capturePayment("payment-1")).rejects.toThrow(BadRequestException);
    });

    it("should capture the payment and update records", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(mockPayment);
      mockStripe.paymentIntents.capture.mockResolvedValue({ status: "succeeded" });

      const result = await service.capturePayment("payment-1");

      expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith(
        "pi_mock",
        {},
        expect.objectContaining({ idempotencyKey: expect.stringContaining("capture-") })
      );
      expect(result).toMatchObject({ status: "succeeded" });
    });
  });

  describe("refundPayment", () => {
    it("should throw NotFoundException when payment not found", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(undefined);

      await expect(service.refundPayment("invalid")).rejects.toThrow(NotFoundException);
    });

    it("should create a refund and update records", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(mockPayment);
      mockStripe.refunds.create.mockResolvedValue({ amount: 2500 });

      const result = await service.refundPayment("payment-1", 2500);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        {
          payment_intent: "pi_mock",
          amount: 2500,
        },
        { idempotencyKey: "refund-payment-1-2500" }
      );
      expect(result).toMatchObject({ status: "refunded", refundAmount: 2500 });
    });
  });

  describe("voidPayment", () => {
    it("should cancel the payment intent", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(mockPayment);
      mockStripe.paymentIntents.cancel.mockResolvedValue({ status: "canceled" });

      const result = await service.voidPayment("payment-1");

      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_mock");
      expect(result).toEqual({ status: "canceled" });
    });
  });

  describe("processStripeWebhook", () => {
    it("should handle payment_intent.succeeded", async () => {
      await service.processStripeWebhook({
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_mock" } },
      });

      expect(db.updateTable as Mock).toHaveBeenCalledWith("payment");
    });

    it("should handle payment_intent.payment_failed and update booking", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue({ booking_id: "booking-1" });
      (db.selectFrom as Mock).mockReturnThis();

      await service.processStripeWebhook({
        type: "payment_intent.payment_failed",
        data: { object: { id: "pi_failed" } },
      });
    });

    it("should handle charge.refunded", async () => {
      await service.processStripeWebhook({
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: "pi_mock",
            amount_refunded: 5000,
            amount: 5000,
          },
        },
      });

      expect(db.updateTable as Mock).toHaveBeenCalledWith("payment");
    });
  });
});
