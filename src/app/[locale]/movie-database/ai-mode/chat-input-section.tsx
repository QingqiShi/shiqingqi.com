"use client";

import { ChatInputBar } from "#src/components/ai-chat/chat-input-bar.tsx";

interface ChatInputSectionProps {
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
}

export function ChatInputSection({
  placeholder,
  sendLabel,
  stopLabel,
}: ChatInputSectionProps) {
  return (
    <ChatInputBar
      placeholder={placeholder}
      sendLabel={sendLabel}
      stopLabel={stopLabel}
      status="ready"
      onSend={() => {}}
      onStop={() => {}}
    />
  );
}
