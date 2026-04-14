"use client";

import { useRouter } from "next/navigation";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";

export function useAIChatSend(aiModeHref: string) {
  const router = useRouter();
  const { sendMessage, status } = useAIChatContext();
  const isLoading = status === "submitted" || status === "streaming";

  function send(message: string) {
    if (isLoading) return;
    void sendMessage({ text: message });
    router.push(aiModeHref);
  }

  return { send, isLoading };
}
