"use client";

import { PaperPlaneRight } from "@phosphor-icons/react/dist/ssr/PaperPlaneRight";
import * as stylex from "@stylexjs/stylex";
import {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  type FormEvent,
} from "react";
import { color, controlSize, font, space } from "@/tokens.stylex";

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(
    {
      onSubmit,
      disabled = false,
      placeholder = "Type a message...",
      maxLength = 1000,
    },
    ref,
  ) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose focus method via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    // Auto-resize textarea
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [value]);

    // Auto-focus when enabled
    useEffect(() => {
      if (!disabled && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [disabled]);

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      const trimmedValue = value.trim();

      if (trimmedValue && !disabled) {
        onSubmit(trimmedValue);
        setValue("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter, new line on Shift+Enter
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    const isOverLimit = value.length > maxLength;
    const canSubmit = value.trim().length > 0 && !disabled && !isOverLimit;

    return (
      <form onSubmit={handleSubmit} css={styles.form}>
        <div css={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            css={[styles.textarea, isOverLimit && styles.textareaError]}
            rows={1}
            aria-label={placeholder}
            aria-invalid={isOverLimit}
            aria-describedby="char-counter"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            css={styles.sendButton}
            aria-label="Send message"
          >
            <PaperPlaneRight weight="fill" size={20} />
          </button>
        </div>
        <div css={styles.footer}>
          <span
            id="char-counter"
            css={[styles.charCounter, isOverLimit && styles.charCounterError]}
            aria-live="polite"
          >
            {value.length}/{maxLength}
          </span>
        </div>
      </form>
    );
  },
);

const styles = stylex.create({
  form: {
    width: "100%",
    padding: space._3,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    backgroundColor: color.backgroundMain,
  },

  inputContainer: {
    display: "flex",
    alignItems: "flex-end",
    gap: space._2,
  },

  textarea: {
    flex: "1 1 auto",
    fontSize: font.size_2,
    lineHeight: 1.5,
    padding: space._2,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: color.controlTrack,
      ":focus-visible": color.controlActive,
      ":disabled": color.controlTrack,
    },
    borderRadius: "8px",
    backgroundColor: color.backgroundRaised,
    color: color.textMain,
    resize: "none",
    minHeight: controlSize._9,
    maxHeight: "200px",
    outlineWidth: {
      default: "0px",
      ":focus-visible": "2px",
    },
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.controlActive,
    },
    opacity: {
      default: 1,
      ":disabled": 0.6,
    },
    cursor: {
      default: "text",
      ":disabled": "not-allowed",
    },
  },

  textareaPlaceholder: {
    color: color.textMuted,
  },

  textareaError: {
    borderColor: color.brandBristol,
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.brandBristol,
    },
  },

  sendButton: {
    minWidth: controlSize._9,
    minHeight: controlSize._9,
    padding: 0,
    borderRadius: "8px",
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":active": color.controlActiveHover,
      ":disabled": color.controlTrack,
    },
    color: color.textOnActive,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
    opacity: {
      default: 1,
      ":disabled": 0.4,
    },
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: space._1,
  },

  charCounter: {
    fontSize: font.size_0,
    color: color.textMuted,
  },

  charCounterError: {
    color: color.brandBristol,
    fontWeight: font.weight_5,
  },
});
