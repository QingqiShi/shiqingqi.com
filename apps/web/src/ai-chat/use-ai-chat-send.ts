"use client";

import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import { useInlineChat } from "#src/components/movie-database/inline-chat-context.tsx";

export function useAIChatSend() {
  const { sendMessage, status } = useAIChatContext();
  const { openChat } = useInlineChat();
  const isLoading = status === "submitted" || status === "streaming";

  function send(message: string) {
    if (isLoading) return;
    void sendMessage({ text: message });
    openChat();
  }

  return { send, isLoading };
}
