import { z } from "zod";
import { UuidSchema } from "./common";

export const NoteSectionSchema = z.object({
  heading: z.string().min(1).max(255),
  content: z.string(),
});

export const CreateNoteSchema = z.object({
  caseFileId: UuidSchema,
  contentMarkdown: z.string().optional(),
  sections: z.array(NoteSectionSchema).optional(),
  summary: z.string().max(2000).optional(),
});

export const UpdateNoteSchema = z.object({
  contentMarkdown: z.string().optional(),
  sections: z.array(NoteSectionSchema).optional(),
  summary: z.string().max(2000).optional(),
});
