"use client";

import * as stylex from "@stylexjs/stylex";
import { cyan } from "@tuja/ui/palette/cyan.stylex";
import { orange } from "@tuja/ui/palette/orange.stylex";
import { pink } from "@tuja/ui/palette/pink.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { red } from "@tuja/ui/palette/red.stylex";
import {
  motionConstants,
  duration,
  easing,
} from "@tuja/ui/primitives/motion.stylex";
import { color, layer } from "@tuja/ui/tokens.stylex";
import { useAIChatContext } from "./ai-chat-provider.tsx";
import type { ChatMood } from "./types.ts";

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
    <div role="presentation" css={[styles.background, styles.moodWash(wash)]} />
  );
}

const styles = stylex.create({
  background: {
    position: "fixed",
    inset: 0,
    zIndex: layer.background,
    pointerEvents: "none",
    // The wash is `currentColor`, so that a transition of `color` fades it
    // from one mood to the next.
    backgroundImage: `radial-gradient(circle, ${color.bgNeutral} 1px, transparent 1px), radial-gradient(ellipse at 80% 20%, currentColor 0%, transparent 70%)`,
    backgroundSize: "24px 24px, 100% 100%",
    backgroundRepeat: "repeat, no-repeat",
    opacity: 0.12,
    transition: {
      default: `color ${duration._700} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  moodWash: (wash: string) => ({
    color: wash,
  }),
});
