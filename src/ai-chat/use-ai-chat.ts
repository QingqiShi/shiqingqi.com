"use client";

import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { z } from "zod";
import type { SupportedLocale } from "#src/types.ts";

export interface ChatMessageMetadata {
  inputTokens?: number;
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

const messageMetadataSchema = z.object({
  inputTokens: z.number().optional(),
});

const chatInstances = new Map<string, Chat<ChatUIMessage>>();

export function useAIChat({ locale }: { locale: SupportedLocale }) {
  let chat = chatInstances.get(locale);
  if (!chat) {
    const transport = new DefaultChatTransport({
      api: "/api/ai-chat",
      body: { locale },
    });
    chat = new Chat<ChatUIMessage>({ transport, messageMetadataSchema });
    chatInstances.set(locale, chat);
  }

  return useChat({ chat });
}
