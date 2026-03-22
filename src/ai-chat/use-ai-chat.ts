"use client";

import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { SupportedLocale } from "#src/types.ts";

const chatInstances = new Map<string, Chat<UIMessage>>();

export function useAIChat({ locale }: { locale: SupportedLocale }) {
  let chat = chatInstances.get(locale);
  if (!chat) {
    const transport = new DefaultChatTransport({
      api: "/api/ai-chat",
      body: { locale },
    });
    chat = new Chat({ transport });
    chatInstances.set(locale, chat);
  }

  return useChat({ chat });
}
