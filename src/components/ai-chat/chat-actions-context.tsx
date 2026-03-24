"use client";

import { createContext, use } from "react";

interface ChatActions {
  sendMessage: (text: string) => void;
}

export const ChatActionsContext = createContext<ChatActions | null>(null);

export function useChatActions() {
  const context = use(ChatActionsContext);
  if (!context) {
    throw new Error(
      "useChatActions must be used within a ChatActionsContext provider",
    );
  }
  return context;
}
