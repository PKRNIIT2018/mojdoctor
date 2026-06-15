import { z } from "zod";
import { UuidSchema, ConsultationModeSchema } from "./common";

export const SlotRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.number().int().min(15).max(120).default(30),
  breakBetween: z.number().int().min(0).max(60).default(5),
  mode: ConsultationModeSchema,
  dateRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
  isActive: z.boolean().default(true),
});

export const CreateSlotRuleSchema = SlotRuleSchema;
export const UpdateSlotRuleSchema = SlotRuleSchema.partial();

export const SlotOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
});

export const CreateSlotOverrideSchema = SlotOverrideSchema;

export const QueryAvailableSlotsSchema = z.object({
  doctorId: UuidSchema,
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  mode: ConsultationModeSchema.optional(),
});
