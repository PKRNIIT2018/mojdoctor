import { z } from "zod";
import { EmailSchema, UuidSchema } from "./common";

export const CreateDoctorSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1).max(255).optional(),
  specialty: z.string().max(255).optional(),
});

export const UpdateDoctorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  specialty: z.string().max(255).optional(),
  licenceNumber: z.string().max(255).optional(),
  clinicName: z.string().max(255).optional(),
  clinicAddress: z.string().max(500).optional(),
  practicePhone: z.string().max(50).optional(),
  language: z.enum(["en", "sk"]).optional(),
  noteTemplateConfig: z
    .array(
      z.object({
        heading: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

export const UpdatePracticeSettingsSchema = z.object({
  slotLength: z.number().int().min(15).max(120).optional(),
  bufferTime: z.number().int().min(0).max(60).optional(),
  consultationFee: z.number().min(0).optional(),
  videoFee: z.number().min(0).optional(),
  inPersonFee: z.number().min(0).optional(),
  cancellationCutoff: z.number().int().min(1).max(72).optional(),
  noteTemplate: z.enum(["soap", "custom", "free_text"]).optional(),
  noteSections: z
    .array(
      z.object({
        name: z.string(),
        order: z.number().int(),
        enabled: z.boolean(),
      })
    )
    .optional(),
  prescriptionHeader: z
    .object({
      name: z.string(),
      specialty: z.string(),
      licenceNumber: z.string(),
      clinicAddress: z.string(),
    })
    .optional(),
});

export const UpdateIntegrationSettingsSchema = z.object({
  transcriptionProvider: z.enum(["web_speech", "whisper", "deepgram"]).optional(),
  transcriptionApiKey: z.string().optional(),
  emailProvider: z.enum(["sendgrid", "ses"]).optional(),
  emailApiKey: z.string().optional(),
  emailFromAddress: z.string().optional(),
  videoProvider: z.enum(["digital_samba", "jitsi"]).optional(),
  videoApiKey: z.string().optional(),
  videoRoomTemplate: z.string().optional(),
  storageProvider: z.enum(["s3", "r2", "scaleway"]).optional(),
  storageBucket: z.string().optional(),
  storageRegion: z.string().optional(),
  storageAccessKey: z.string().optional(),
  storageSecretKey: z.string().optional(),
});

export const UpdateNotificationPrefsSchema = z.object({
  dailyAgendaTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  newBookingAlert: z.boolean().optional(),
  noShowAlert: z.boolean().optional(),
});

export const CreateStripeConnectAccountSchema = z.object({
  refreshUrl: z.string().url(),
  returnUrl: z.string().url(),
});

export const StripeConnectAccountLinkSchema = z.object({
  refreshUrl: z.string().url(),
  returnUrl: z.string().url(),
});
