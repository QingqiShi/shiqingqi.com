"use client";

import * as stylex from "@stylexjs/stylex";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import type { ChatMood } from "#src/ai-chat/chat-message-metadata.ts";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { color, layer } from "#src/tokens.stylex.ts";

const MOOD_WASH_COLORS: Record<ChatMood, string> = {
  warm: "#f97316",
  cool: "#0ea5e9",
  tense: "#ef4444",
  epic: "#8b5cf6",
  playful: "#ec4899",
  neutral: "#7e10c2",
};

export function DotGridBackground() {
  const { mood } = useAIChatContext();
  const wash = MOOD_WASH_COLORS[mood ?? "neutral"];
  return (
    <div
      css={styles.background}
      role="presentation"
      style={{ "--chat-mood-wash": wash }}
    />
  );
}

const styles = stylex.create({
  background: {
    position: "fixed",
    inset: 0,
    zIndex: layer.background,
    pointerEvents: "none",
    backgroundImage: `radial-gradient(circle, ${color.textMuted} 1px, transparent 1px), radial-gradient(ellipse at 80% 20%, var(--chat-mood-wash) 0%, transparent 70%)`,
    backgroundSize: "24px 24px, 100% 100%",
    backgroundRepeat: "repeat, no-repeat",
    opacity: 0.12,
    transition: {
      default: "--chat-mood-wash 700ms ease-out",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
