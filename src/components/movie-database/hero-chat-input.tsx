"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import { space } from "#src/tokens.stylex.ts";
import { SuggestionChips } from "../ai-chat/suggestion-chips";
import { ChatTextarea } from "../shared/chat-textarea";

interface HeroChatInputProps {
  placeholder: string;
  sendLabel: string;
  aiModeHref: string;
  suggestions: ReadonlyArray<string>;
  suggestionsGroupLabel: string;
}

export function HeroChatInput({
  placeholder,
  sendLabel,
  aiModeHref,
  suggestions,
  suggestionsGroupLabel,
}: HeroChatInputProps) {
  const router = useRouter();
  const { sendMessage, status } = useAIChatContext();
  const isLoading = status === "submitted" || status === "streaming";

  function send(message: string) {
    if (isLoading) return;
    void sendMessage({ text: message });
    router.push(aiModeHref);
  }

  return (
    <>
      <ChatTextarea
        placeholder={placeholder}
        sendLabel={sendLabel}
        onSubmit={send}
        disabled={isLoading}
      />
      <div css={styles.suggestions}>
        <SuggestionChips
          suggestions={suggestions}
          groupLabel={suggestionsGroupLabel}
          onSelect={send}
          disabled={isLoading}
        />
      </div>
    </>
  );
}

const styles = stylex.create({
  suggestions: {
    marginTop: space._3,
  },
});
