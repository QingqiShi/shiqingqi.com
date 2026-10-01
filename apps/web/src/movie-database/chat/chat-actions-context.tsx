"use client";

import { createContext, use } from "react";

export interface AttachedMedia {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
}

interface ChatActions {
  sendMessage: (text: string) => void;
  attachedMedia: AttachedMedia | null;
  setAttachedMedia: (media: AttachedMedia | null) => void;
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
