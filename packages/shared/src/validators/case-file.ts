import { z } from "zod";
import { UuidSchema } from "./common";

export const CreateCaseFileSchema = z.object({
  bookingId: UuidSchema,
  doctorId: UuidSchema,
  patientName: z.string().min(1).max(255),
  patientEmail: z.string().email().max(255),
});

export const AddDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  r2Key: z.string().max(500).optional(),
  category: z
    .enum(["intake", "prescription", "lab_result", "imaging", "referral", "other"])
    .optional(),
});
