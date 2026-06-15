import { z } from "zod";
import { EmailSchema } from "./common";

export const CreateMessageTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().max(255).optional(),
  bodyMarkdown: z.string().optional(),
  event: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateMessageTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().max(255).optional(),
  bodyMarkdown: z.string().optional(),
  event: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

export const SendEmailSchema = z.object({
  to: EmailSchema,
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  bookingId: z.string().uuid().optional(),
});
