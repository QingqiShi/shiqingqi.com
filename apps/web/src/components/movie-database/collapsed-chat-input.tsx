"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { useAIChatSend } from "#src/ai-chat/use-ai-chat-send.ts";
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
    // Below `lg` the filters leave too little room for a field worth typing
    // in, so the toolbar falls back to `CollapsedChatButton`.
    display: { default: "none", [breakpoints.lg]: "flex" },
    willChange: "transform, opacity",
    // Room to type in. A fixed width (rather than `min(22rem, 100%)`, whose
    // percentage counts as `auto` when the ancestor flex item is sized from
    // its content) is what makes the toolbar reserve the room; `maxInlineSize`
    // hands it back when the filters need it.
    inlineSize: "22rem",
    maxInlineSize: "100%",
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
    color: color.accent,
    fontSize: "1.125em",
  },
});
