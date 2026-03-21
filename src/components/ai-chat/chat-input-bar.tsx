"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { StopIcon } from "@phosphor-icons/react/dist/ssr/Stop";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { border, color, font, space } from "#src/tokens.stylex.ts";

interface ChatInputBarProps {
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  status: "submitted" | "streaming" | "ready" | "error";
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInputBar({
  placeholder,
  sendLabel,
  stopLabel,
  status,
  onSend,
  onStop,
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "submitted" || status === "streaming";
  const trimmed = text.trim();

  function resetTextarea() {
    setText("");
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
    }
  }

  function send() {
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    resetTextarea();
    textareaRef.current?.focus();
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  function handleStop() {
    onStop();
    textareaRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} css={styles.container}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={1}
        disabled={isLoading}
        css={styles.textarea}
        autoComplete="off"
      />
      {isLoading ? (
        <button
          type="button"
          aria-label={stopLabel}
          onClick={handleStop}
          css={[styles.iconButton, styles.iconButtonActive]}
        >
          <StopIcon weight="fill" role="presentation" />
        </button>
      ) : (
        <button
          type="submit"
          aria-label={sendLabel}
          disabled={!trimmed}
          css={[styles.iconButton, !!trimmed && styles.iconButtonActive]}
        >
          <ArrowUpIcon weight="bold" role="presentation" />
        </button>
      )}
    </form>
  );
}

const styles = stylex.create({
  container: {
    width: "100%",
    display: "flex",
    alignItems: "center",
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
    maxHeight: "200px",
    overflowY: "auto",
    "::placeholder": {
      color: color.textMuted,
    },
  },
  iconButton: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.75rem",
    height: "1.75rem",
    borderRadius: border.radius_round,
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    cursor: { default: "pointer", ":disabled": "default" },
    padding: 0,
    backgroundColor: color.controlTrack,
    color: color.textMuted,
    opacity: { default: null, ":disabled": 0.5 },
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  iconButtonActive: {
    backgroundColor: color.controlActive,
    color: color.textOnActive,
  },
});
