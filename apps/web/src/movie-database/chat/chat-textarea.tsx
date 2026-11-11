"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, space } from "@tuja/ui/tokens.stylex";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  multiline = false,
  compact = false,
  beforeTextarea,
  children,
}: ChatTextareaProps) {
  const [text, setText] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const trimmed = text.trim();
  const sendBlocked = disabled || submitDisabled;

  // A ref object typed for both elements can't be handed to either `ref` prop
  // directly (the object types are invariant), so assign it from a callback.
  function captureField(node: HTMLTextAreaElement | HTMLInputElement | null) {
    fieldRef.current = node;
  }

  function resetHeight() {
    const field = fieldRef.current;
    if (multiline && field) {
      field.style.height = "auto";
    }
  }

  // The grown height is a pixel value measured at the width the text wrapped
  // at, and nothing re-measures it on its own: resize or rotate after typing
  // and the last lines sit clipped below the fold of a box whose whole job is
  // to fit them. Re-measure when the viewport changes, which is what moves
  // this field's width.
  useEffect(() => {
    if (!multiline) return;

    function fitToContent() {
      const field = fieldRef.current;
      if (!field) return;
      field.style.height = "auto";
      field.style.height = `${String(field.scrollHeight)}px`;
    }

    window.addEventListener("resize", fitToContent);
    return () => {
      window.removeEventListener("resize", fitToContent);
    };
  }, [multiline]);

  function focusTextarea() {
    fieldRef.current?.focus();
  }

  function submit() {
    if (!trimmed || sendBlocked) return;
    onSubmit(trimmed);
    setText("");
    resetHeight();
    focusTextarea();
  }

  function handleChange(
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) {
    setText(event.target.value);
    if (multiline) {
      const field = event.target;
      field.style.height = "auto";
      field.style.height = `${String(field.scrollHeight)}px`;
    }
  }

  function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) {
    if (event.key !== "Enter") return;

    // Skip during IME composition (e.g. Chinese/Japanese/Korean input) —
    // Enter should confirm the composed characters, not submit the message.
    if (event.nativeEvent.isComposing) return;

    if (event.shiftKey) {
      // A newline only lands somewhere visible on the multi-line composer.
      // On the single-line field the key is swallowed rather than sent: an
      // unhandled Enter would implicitly submit the form, dispatching a
      // half-written prompt to someone who was reaching for a line break.
      if (!multiline) event.preventDefault();
      return;
    }

    event.preventDefault();
    submit();
  }

  return (
    <ChatTextareaContext value={{ trimmedText: trimmed, focusTextarea }}>
      <form
        onSubmit={handleSubmit}
        css={[
          flex.wrap,
          corner.radius_3,
          a11y.focusRingWithin,
          styles.container,
          compact && styles.containerCompact,
        ]}
      >
        {beforeTextarea}
        {multiline ? (
          <textarea
            ref={captureField}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            rows={1}
            disabled={disabled}
            css={[
              stylex.defaultMarker(),
              typeRole.body,
              typeModifier.verbatim,
              styles.field,
              styles.fieldMultiline,
            ]}
            autoComplete="off"
            enterKeyHint="send"
          />
        ) : (
          <input
            ref={captureField}
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={disabled}
            css={[
              stylex.defaultMarker(),
              typeRole.body,
              typeModifier.verbatim,
              styles.field,
              styles.fieldSingleLine,
            ]}
            autoComplete="off"
            enterKeyHint="send"
          />
        )}
        {children ?? (
          <Button
            type="submit"
            look={trimmed ? "primary" : undefined}
            size="sm"
            aria-label={sendLabel}
            disabled={!trimmed || sendBlocked}
            icon={<ArrowUpIcon weight="bold" role="presentation" />}
          />
        )}
      </form>
    </ChatTextareaContext>
  );
}

const styles = stylex.create({
  container: {
    width: "100%",
    gap: controlSize._2,
    backgroundColor: color.card,
    paddingBlock: space._2,
    paddingLeft: space._3,
    paddingRight: space._2,
  },
  containerCompact: {
    paddingBlock: space._1,
    paddingLeft: space._2,
  },
  field: {
    flexGrow: 1,
    // Take up the leftover space rather than the control's intrinsic `cols`/
    // `size` width: a narrow bar then truncates the text instead of wrapping
    // the send button onto a second row (the form wraps for the attachment
    // row).
    flexBasis: 0,
    minWidth: 0,
    resize: "none",
    borderWidth: 0,
    borderStyle: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: color.foreground,
    fontFamily: font.family,
    padding: 0,
    "::placeholder": {
      color: color.mutedForeground,
    },
  },
  fieldMultiline: {
    maxHeight: "200px",
    overflowY: "auto",
  },
  fieldSingleLine: {
    // Only an `<input>` honours this — a textarea clips its placeholder
    // mid-word instead, which is why the single-line variant is not one.
    textOverflow: "ellipsis",
  },
});
