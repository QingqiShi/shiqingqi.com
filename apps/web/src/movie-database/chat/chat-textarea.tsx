"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { Button } from "@tuja/ui/components/button";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { createContext, use, useRef, useState, type ReactNode } from "react";

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
  /**
   * Render a multi-line composer: a `<textarea>` that grows with its content,
   * where Shift+Enter inserts a newline. Without it the field is a single-line
   * `<input>` — text that overruns it is truncated with an ellipsis, Enter
   * sends, and Shift+Enter does nothing, there being no second line to put a
   * newline on.
   */
  multiline?: boolean;
  /** As tall as the other controls of a sticky toolbar. */
  compact?: boolean;
  /** A decorative icon before the text. */
  leading?: ReactNode;
  /** A row above the text, such as the attachment. */
  header?: ReactNode;
  /** Override the default send button. Use `useChatTextarea()` inside children to access context. */
  children?: ReactNode;
}

export function ChatTextarea({
  placeholder,
  sendLabel,
  onSubmit,
  disabled = false,
  submitDisabled = false,
  multiline = false,
  compact = false,
  leading,
  header,
  children,
}: ChatTextareaProps) {
  const [text, setText] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const trimmed = text.trim();
  const sendBlocked = disabled || submitDisabled;

  function focusTextarea() {
    fieldRef.current?.focus();
  }

  function submit() {
    if (!trimmed || sendBlocked) return;
    onSubmit(trimmed);
    setText("");
    focusTextarea();
  }

  return (
    <ChatTextareaContext value={{ trimmedText: trimmed, focusTextarea }}>
      <PromptField
        ref={fieldRef}
        label={placeholder}
        placeholder={placeholder}
        value={text}
        onValueChange={setText}
        onSubmit={submit}
        size={compact ? "md" : "lg"}
        multiline={multiline}
        disabled={disabled}
        leading={leading}
        header={header}
        action={
          children ?? (
            <Button
              type="submit"
              look={trimmed ? "primary" : undefined}
              size="sm"
              aria-label={sendLabel}
              disabled={!trimmed || sendBlocked}
              icon={<ArrowUpIcon weight="bold" role="presentation" />}
            />
          )
        }
      />
    </ChatTextareaContext>
  );
}
