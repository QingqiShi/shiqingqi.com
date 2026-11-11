"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { StopIcon } from "@phosphor-icons/react/dist/ssr/Stop";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import type { AttachedMedia } from "./chat-actions-context";
import { ChatTextarea, useChatTextarea } from "./chat-textarea.tsx";

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
      // Keep the textarea editable while the assistant streams so users can
      // compose follow-ups mid-stream. Submit is still gated via
      // `submitDisabled`, and the visible send/stop swap below makes the
      // current state obvious.
      submitDisabled={isLoading}
      multiline
      beforeTextarea={
        attachedMedia && (
          <div css={styles.attachmentRow}>
            <Badge intent="neutral" css={styles.attachmentTag}>
              <span css={truncate.base}>{attachedMedia.title}</span>
            </Badge>
            <Button
              look="ghost"
              size="xs"
              aria-label={removeAttachmentLabel}
              onClick={onClearAttachment}
              icon={<XIcon weight="bold" aria-hidden="true" />}
            />
          </div>
        )
      }
    >
      <ChatInputBarActions
        isLoading={isLoading}
        sendLabel={sendLabel}
        stopLabel={stopLabel}
        onStop={onStop}
      />
    </ChatTextarea>
  );
}

function ChatInputBarActions({
  isLoading,
  sendLabel,
  stopLabel,
  onStop,
}: {
  isLoading: boolean;
  sendLabel: string;
  stopLabel: string;
  onStop: () => void;
}) {
  const { trimmedText, focusTextarea } = useChatTextarea();

  if (isLoading) {
    return (
      <Button
        look="primary"
        size="sm"
        aria-label={stopLabel}
        onClick={() => {
          onStop();
          focusTextarea();
        }}
        icon={<StopIcon weight="fill" role="presentation" />}
      />
    );
  }

  return (
    <Button
      type="submit"
      look={trimmedText ? "primary" : undefined}
      size="sm"
      aria-label={sendLabel}
      disabled={!trimmedText}
      icon={<ArrowUpIcon weight="bold" role="presentation" />}
    />
  );
}

const styles = stylex.create({
  attachmentRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: controlSize._1,
    paddingBottom: space._1,
  },
  attachmentTag: {
    minInlineSize: 0,
    maxWidth: "100%",
  },
});
