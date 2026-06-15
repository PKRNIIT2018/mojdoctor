import { z } from "zod";
import {
  EmailSchema,
  PhoneSchema,
  UuidSchema,
  PaymentMethodSchema,
  StatusSchema,
  ConsultationModeSchema,
  LanguageSchema,
  PinSchema,
} from "./common";

export const CreateBookingSchema = z.object({
  slotId: UuidSchema,
  doctorId: UuidSchema,
  patientName: z.string().min(1).max(255),
  patientEmail: EmailSchema,
  patientPhone: PhoneSchema,
  reason: z.string().max(2000).optional(),
  paymentMethod: PaymentMethodSchema,
  language: LanguageSchema,
  gdprConsent: z.literal("granted"),
  documentPin: PinSchema.optional(),
});

export const ApproveBookingSchema = z.object({
  bookingId: UuidSchema,
  paymentNote: z.string().max(500).optional(),
});

export const ApproveAsAgreedSchema = z.object({
  bookingId: UuidSchema,
  internalNote: z.string().max(500).optional(),
});

export const PostponeBookingSchema = z.object({
  bookingId: UuidSchema,
  alternativeSlotIds: z.array(UuidSchema).min(1).max(3),
});

export const RejectBookingSchema = z.object({
  bookingId: UuidSchema,
  reason: z.string().min(1).max(1000),
});

export const CancelBookingSchema = z.object({
  bookingId: UuidSchema,
});

export const PatientRescheduleSchema = z.object({
  bookingId: UuidSchema,
  selectedSlotId: UuidSchema,
});

export const SearchBookingSchema = z.object({
  query: z.string().min(1).max(100),
});

export const CheckReturningPatientSchema = z.object({
  email: EmailSchema,
});
