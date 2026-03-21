"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { StopIcon } from "@phosphor-icons/react/dist/ssr/Stop";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { Button } from "../shared/button";

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
        <Button
          type="button"
          icon={<StopIcon weight="fill" role="presentation" />}
          aria-label={stopLabel}
          onClick={handleStop}
          isActive
        />
      ) : (
        <Button
          type="submit"
          icon={<ArrowUpIcon weight="bold" role="presentation" />}
          aria-label={sendLabel}
          disabled={!trimmed}
          bright
        />
      )}
    </form>
  );
}

const styles = stylex.create({
  container: {
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
    gap: space._1,
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_3,
    paddingBlock: space._1,
    paddingLeft: space._3,
    paddingRight: space._1,
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
    padding: `${space._1} 0`,
    maxHeight: "200px",
    overflowY: "auto",
    "::placeholder": {
      color: color.textMuted,
    },
  },
});
