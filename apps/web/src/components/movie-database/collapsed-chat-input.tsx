"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { useAIChatSend } from "#src/ai-chat/use-ai-chat-send.ts";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color } from "#src/tokens.stylex.ts";
import { ChatTextarea } from "../shared/chat-textarea";
import {
  DATA_HERO_COLLAPSED_BUTTON,
  useHeroVisibility,
} from "./hero-visibility-context";

interface CollapsedChatInputProps {
  placeholder: string;
  sendLabel: string;
}

export function CollapsedChatInput({
  placeholder,
  sendLabel,
}: CollapsedChatInputProps) {
  const { send, isLoading } = useAIChatSend();
  const { isHeroInputVisible } = useHeroVisibility();

  return (
    <div
      css={[
        styles.container,
        isHeroInputVisible ? styles.hidden : styles.visible,
      ]}
      aria-hidden={isHeroInputVisible || undefined}
      inert={isHeroInputVisible || undefined}
      {...{ [DATA_HERO_COLLAPSED_BUTTON]: "" }}
    >
      <ChatTextarea
        placeholder={placeholder}
        sendLabel={sendLabel}
        onSubmit={send}
        submitDisabled={isLoading}
        compact
        beforeTextarea={
          <span css={[flex.inlineCenter, styles.icon]}>
            <SparkleIcon weight="fill" role="presentation" />
          </span>
        }
      />
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: { default: "none", [breakpoints.md]: "flex" },
    willChange: "transform, opacity",
    width: "min(22rem, 100%)",
  },
  visible: {
    opacity: 1,
    pointerEvents: "auto",
  },
  hidden: {
    opacity: 0,
    pointerEvents: "none",
  },
  icon: {
    color: color.controlActive,
    fontSize: "1.125em",
  },
});
