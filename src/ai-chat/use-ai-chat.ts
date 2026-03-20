"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { SupportedLocale } from "#src/types.ts";

export function useAIChat({ locale }: { locale: SupportedLocale }) {
  const transport = new DefaultChatTransport({
    api: "/api/ai-chat",
    body: { locale },
  });

  return useChat({ transport });
}
