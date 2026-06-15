import { z } from "zod";
import { UuidSchema } from "./common";

export const PreConsultQuestionSchema = z.object({
  label: z.string().min(1).max(500),
  type: z.enum(["text", "textarea", "select", "checkbox", "date"]),
  required: z.boolean(),
});

export const CreatePreConsultTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  questions: z.array(PreConsultQuestionSchema).min(1).max(50),
  isActive: z.boolean().optional(),
});

export const UpdatePreConsultTemplateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  questions: z.array(PreConsultQuestionSchema).min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const SubmitIntakeResponseSchema = z.object({
  bookingId: UuidSchema,
  responses: z.record(z.string(), z.unknown()),
});
