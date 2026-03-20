import { z } from "zod";

export const chatInputSchema = z.object({
  message: z.string().min(1).max(2000),
  locale: z.enum(["en", "zh"]).default("en"),
});

export type ChatInput = z.infer<typeof chatInputSchema>;
