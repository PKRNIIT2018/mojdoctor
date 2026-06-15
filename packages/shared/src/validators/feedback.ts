import { z } from "zod";
import { UuidSchema } from "./common";

export const CreateFeedbackSchema = z.object({
  bookingId: UuidSchema,
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});
