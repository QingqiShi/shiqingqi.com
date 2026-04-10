"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { StopIcon } from "@phosphor-icons/react/dist/ssr/Stop";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { truncate } from "#src/primitives/layout.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { ChatTextarea, chatTextareaStyles } from "../shared/chat-textarea";
import type { AttachedMedia } from "./chat-actions-context";

interface ChatInputBarProps {
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  removeAttachmentLabel: string;
  status: "submitted" | "streaming" | "ready" | "error";
  attachedMedia: AttachedMedia | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onClearAttachment: () => void;
}

export function ChatInputBar({
  placeholder,
  sendLabel,
  stopLabel,
  removeAttachmentLabel,
  status,
  attachedMedia,
  onSend,
  onStop,
  onClearAttachment,
}: ChatInputBarProps) {
  const isLoading = status === "submitted" || status === "streaming";

  return (
    <ChatTextarea
      placeholder={placeholder}
      sendLabel={sendLabel}
      onSubmit={onSend}
      disabled={isLoading}
      autoGrow
      beforeTextarea={
        attachedMedia && (
          <div css={styles.attachmentRow}>
            <span css={[truncate.base, styles.attachmentTag]}>
              {attachedMedia.title}
              <button
                type="button"
                aria-label={removeAttachmentLabel}
                onClick={onClearAttachment}
                css={[
                  flex.inlineCenter,
                  buttonReset.base,
                  styles.attachmentDismiss,
                ]}
              >
                <XIcon size={12} aria-hidden="true" />
              </button>
            </span>
          </div>
        )
      }
      actionButton={({ trimmedText, focusTextarea }) =>
        isLoading ? (
          <button
            type="button"
            aria-label={stopLabel}
            onClick={() => {
              onStop();
              focusTextarea();
            }}
            css={[
              flex.inlineCenter,
              buttonReset.base,
              chatTextareaStyles.iconButton,
              chatTextareaStyles.iconButtonActive,
            ]}
          >
            <StopIcon weight="fill" role="presentation" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label={sendLabel}
            disabled={!trimmedText}
            css={[
              flex.inlineCenter,
              buttonReset.base,
              chatTextareaStyles.iconButton,
              !!trimmedText && chatTextareaStyles.iconButtonActive,
            ]}
          >
            <ArrowUpIcon weight="bold" role="presentation" />
          </button>
        )
      }
    />
  );
}

const styles = stylex.create({
  attachmentRow: {
    width: "100%",
    display: "flex",
    paddingBottom: space._1,
  },
  attachmentTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    backgroundColor: color.backgroundHover,
    borderRadius: border.radius_round,
    paddingBlock: space._0,
    paddingLeft: space._2,
    paddingRight: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    maxWidth: "100%",
  },
  attachmentDismiss: {
    flexShrink: 0,
    width: "1rem",
    height: "1rem",
    borderRadius: border.radius_round,
    backgroundColor: {
      default: "transparent",
      ":hover": color.controlTrack,
    },
    color: color.textMuted,
    transition: "background-color 0.15s ease",
  },
});
