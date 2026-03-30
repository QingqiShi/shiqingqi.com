import type { UIMessage } from "ai";
import { z } from "zod";
import { isUIMessage } from "./is-ui-message";

const localeField = { locale: z.enum(["en", "zh"]).default("en") };

export const sessionChatInputSchema = z.discriminatedUnion("trigger", [
  z.object({
    sessionId: z.string().uuid().optional(),
    ...localeField,
    trigger: z.literal("submit-message"),
    message: z.custom<UIMessage>(isUIMessage),
  }),
  z.object({
    sessionId: z.string().uuid(),
    ...localeField,
    trigger: z.literal("regenerate-message"),
  }),
]);

export type SessionChatInput = z.infer<typeof sessionChatInputSchema>;

export const sessionIdSchema = z.string().uuid();
