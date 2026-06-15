import { z } from "zod";

export const EmailSchema = z.string().email().max(255);
export const PhoneSchema = z
  .string()
  .regex(/^\+?[0-9\s\-()]{7,20}$/)
  .optional();
export const UuidSchema = z.string().uuid();
export const StatusSchema = z.enum([
  "PENDING_REVIEW",
  "AWAITING_CARD",
  "AWAITING_PATIENT_RESCHEDULE",
  "AWAITING_DOCTOR_REAPPROVAL",
  "CONFIRMED",
  "CAPTURED",
  "COMPLETED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "REJECTED",
  "NO_SHOW",
  "PAYMENT_FAILED",
]);
export const ConsultationModeSchema = z.enum(["video", "in-person"]);
export const PaymentMethodSchema = z.enum(["card", "other", "as_agreed"]);
export const LanguageSchema = z.enum(["en", "sk"]);
export const PinSchema = z
  .string()
  .length(4)
  .regex(/^\d{4}$/);
