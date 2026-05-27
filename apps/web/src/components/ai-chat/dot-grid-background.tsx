"use client";

import * as stylex from "@stylexjs/stylex";
import { cyan } from "@tuja/ui/palette/cyan";
import { orange } from "@tuja/ui/palette/orange";
import { pink } from "@tuja/ui/palette/pink";
import { purple } from "@tuja/ui/palette/purple";
import { red } from "@tuja/ui/palette/red";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color, layer } from "@tuja/ui/tokens.stylex";
import { useAIChatContext } from "#src/ai-chat/ai-chat-context.tsx";
import type { ChatMood } from "#src/ai-chat/chat-message-metadata.ts";

// Each mood lights a different palette hue so the background tint matches the
// conversation's emotional register without ever leaving the system palette.
const MOOD_WASH_COLORS: Record<ChatMood, string> = {
  warm: orange._60,
  cool: cyan._60,
  tense: red._50,
  epic: purple._50,
  playful: pink._50,
  neutral: purple._30,
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
