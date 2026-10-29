"use client";

import type { SupportedLocale } from "@tuja/i18n/types";
import { createContext, use, type ReactNode } from "react";
import { useAIChat } from "./use-ai-chat";

type AIChatState = ReturnType<typeof useAIChat>;

const AIChatContext = createContext<AIChatState | null>(null);

export function AIChatProvider({
  locale,
  children,
}: {
  locale: SupportedLocale;
  children: ReactNode;
}) {
  const aiChat = useAIChat({ locale });
  return <AIChatContext value={aiChat}>{children}</AIChatContext>;
}

export function useAIChatContext() {
  const context = use(AIChatContext);
  if (!context) {
    throw new Error("useAIChatContext must be used within an AIChatProvider");
  }
  return context;
}
