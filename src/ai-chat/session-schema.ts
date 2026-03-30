import type { UIMessage } from "ai";
import { z } from "zod";
import { isUIMessage } from "./is-ui-message";

const sharedFields = {
  sessionId: z.string().uuid().optional(),
  locale: z.enum(["en", "zh"]).default("en"),
};

export const sessionChatInputSchema = z.discriminatedUnion("trigger", [
  z.object({
    ...sharedFields,
    trigger: z.literal("submit-message"),
    message: z.custom<UIMessage>(isUIMessage),
  }),
  z.object({
    ...sharedFields,
    trigger: z.literal("regenerate-message"),
  }),
]);

export type SessionChatInput = z.infer<typeof sessionChatInputSchema>;

export const sessionIdSchema = z.string().uuid();
