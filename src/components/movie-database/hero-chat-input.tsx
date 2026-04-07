"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { SuggestionChips } from "../ai-chat/suggestion-chips";

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
  const [text, setText] = useState("");
  const router = useRouter();
  const { sendMessage, status } = useAIChatContext();
  const trimmed = text.trim();
  const isLoading = status === "submitted" || status === "streaming";

  function send(message: string) {
    if (isLoading) return;
    void sendMessage({ text: message });
    router.push(aiModeHref);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    send(trimmed);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (trimmed) {
        send(trimmed);
      }
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} css={[flex.wrap, styles.container]}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          css={styles.textarea}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          aria-label={sendLabel}
          disabled={!trimmed || isLoading}
          css={[
            flex.inlineCenter,
            buttonReset.base,
            styles.iconButton,
            !!trimmed && styles.iconButtonActive,
          ]}
        >
          <ArrowUpIcon weight="bold" role="presentation" />
        </button>
      </form>
      <div css={styles.suggestions}>
        <SuggestionChips
          suggestions={suggestions}
          groupLabel={suggestionsGroupLabel}
          onSelect={send}
        />
      </div>
    </>
  );
}

const styles = stylex.create({
  container: {
    width: "100%",
    gap: space._1,
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_3,
    paddingBlock: space._2,
    paddingLeft: space._3,
    paddingRight: space._2,
  },
  textarea: {
    flexGrow: 1,
    resize: "none",
    borderWidth: 0,
    borderStyle: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: color.textMain,
    fontFamily: font.family,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
    padding: 0,
    "::placeholder": {
      color: color.textMuted,
    },
  },
  iconButton: {
    flexShrink: 0,
    width: "1.75rem",
    height: "1.75rem",
    borderRadius: border.radius_round,
    cursor: { default: "pointer", ":disabled": "default" },
    backgroundColor: color.controlTrack,
    color: color.textMuted,
    opacity: { default: null, ":disabled": 0.5 },
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  iconButtonActive: {
    backgroundColor: color.controlActive,
    color: color.textOnActive,
  },
  suggestions: {
    marginTop: space._3,
  },
});
