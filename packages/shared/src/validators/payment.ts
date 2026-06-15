import { z } from "zod";
import { UuidSchema } from "./common";

export const CreateSetupIntentSchema = z.object({
  bookingId: UuidSchema,
});

export const CreatePaymentIntentSchema = z.object({
  bookingId: UuidSchema,
  amount: z.number().int().min(0),
});

export const CapturePaymentSchema = z.object({
  paymentIntentId: z.string(),
});

export const RefundPaymentSchema = z.object({
  paymentId: UuidSchema,
  amount: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
});

export const RetryPaymentSchema = z.object({
  bookingId: UuidSchema,
});
