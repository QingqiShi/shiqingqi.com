"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { createContext, use, useRef, useState, type ReactNode } from "react";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

interface ChatTextareaContextValue {
  trimmedText: string;
  focusTextarea: () => void;
}

const ChatTextareaContext = createContext<ChatTextareaContextValue | null>(
  null,
);

export function useChatTextarea() {
  const ctx = use(ChatTextareaContext);
  if (!ctx) {
    throw new Error("useChatTextarea must be used within a ChatTextarea");
  }
  return ctx;
}

interface ChatTextareaProps {
  placeholder: string;
  sendLabel: string;
  onSubmit: (text: string) => void;
  /**
   * Full lockout: textarea is uneditable AND submit is blocked. Use only
   * when typing genuinely shouldn't happen.
   */
  disabled?: boolean;
  /**
   * Narrower lockout: textarea stays editable so the user can compose the
   * next message, but submit is blocked. Used while the assistant is
   * streaming a response — the user expects to be able to draft a follow-up
   * mid-stream the same way they can in every other modern chat UI.
   */
  submitDisabled?: boolean;
  autoGrow?: boolean;
  /** Reduced vertical padding for use inside sticky toolbars. */
  compact?: boolean;
  /** Content rendered before the textarea (e.g. attachment row). */
  beforeTextarea?: ReactNode;
  /** Override the default send button. Use `useChatTextarea()` inside children to access context. */
  children?: ReactNode;
}

export function ChatTextarea({
  placeholder,
  sendLabel,
  onSubmit,
  disabled = false,
  submitDisabled = false,
  autoGrow = false,
  compact = false,
  beforeTextarea,
  children,
}: ChatTextareaProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const trimmed = text.trim();
  const sendBlocked = disabled || submitDisabled;

  function resetHeight() {
    if (autoGrow && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function focusTextarea() {
    textareaRef.current?.focus();
  }

  function submit() {
    if (!trimmed || sendBlocked) return;
    onSubmit(trimmed);
    setText("");
    resetHeight();
    focusTextarea();
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    if (autoGrow) {
      const textarea = event.target;
      textarea.style.height = "auto";
      textarea.style.height = `${String(textarea.scrollHeight)}px`;
    }
  }

  function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Skip during IME composition (e.g. Chinese/Japanese/Korean input) —
    // Enter should confirm the composed characters, not submit the message.
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <ChatTextareaContext value={{ trimmedText: trimmed, focusTextarea }}>
      <form
        onSubmit={handleSubmit}
        css={[flex.wrap, styles.container, compact && styles.containerCompact]}
      >
        {beforeTextarea}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          disabled={disabled}
          css={[styles.textarea, autoGrow && styles.textareaAutoGrow]}
          autoComplete="off"
          enterKeyHint="send"
        />
        {children ?? (
          <button
            type="submit"
            aria-label={sendLabel}
            disabled={!trimmed || sendBlocked}
            css={[
              flex.inlineCenter,
              buttonReset.base,
              chatTextareaStyles.iconButton,
              !!trimmed && chatTextareaStyles.iconButtonActive,
            ]}
          >
            <ArrowUpIcon weight="bold" role="presentation" />
          </button>
        )}
      </form>
    </ChatTextareaContext>
  );
}

/** Shared icon-button styles for custom action buttons composed by consumers. */
export const chatTextareaStyles = stylex.create({
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
});

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
  containerCompact: {
    paddingBlock: space._1,
    paddingLeft: space._2,
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
  textareaAutoGrow: {
    maxHeight: "200px",
    overflowY: "auto",
  },
});
