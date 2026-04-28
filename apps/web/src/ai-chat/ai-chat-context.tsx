"use client";

import { createContext, use, type ReactNode } from "react";
import type { SupportedLocale } from "#src/types.ts";
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
