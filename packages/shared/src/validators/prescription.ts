import { z } from "zod";
import { UuidSchema } from "./common";

export const CreatePrescriptionSchema = z.object({
  doctorNoteId: UuidSchema,
  medicationName: z.string().min(1).max(255),
  dosage: z.string().min(1).max(255),
  frequency: z.string().min(1).max(255),
  duration: z.string().min(1).max(255),
  quantity: z.string().min(1).max(255),
  notes: z.string().max(500).optional(),
});
