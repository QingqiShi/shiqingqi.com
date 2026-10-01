import { useAIChatContext } from "./ai-chat-provider.tsx";
import { useInlineChat } from "./inline-chat-context.tsx";

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
