"use client";

import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color, layer } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";
import { init, start, type ColorOptions } from "./loop";
import fs from "./shaders/fs.glsl";
import vs from "./shaders/vs.glsl";

// Mirrors color.background — keep in sync if the token value changes.
const DARK_COLORS = {
  colorBackground: [0, 0, 0],
} satisfies ColorOptions;

const LIGHT_COLORS = {
  colorBackground: [0xed / 0xff, 0xec / 0xff, 0xe8 / 0xff],
  colorTop: [0.6, 0.5, 0.7],
  colorBottom: [0.4, 0.4, 1],
  colorAltTop: [1, 0.3, 0.3],
  colorAltBottom: [1, 0.3, 0.3],
} satisfies ColorOptions;

export function FlowGradient() {
  const [theme] = useTheme();
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    false,
  );
  const isDark = theme === "system" ? preferDark : theme === "dark";

  const colorsRef = useRef<ColorOptions>(isDark ? DARK_COLORS : LIGHT_COLORS);
  const contextRef = useRef<ReturnType<typeof init>>(undefined);

  useEffect(() => {
    colorsRef.current = isDark ? DARK_COLORS : LIGHT_COLORS;
  }, [isDark]);

  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;
    return start(context, colorsRef, { reducedMotion: prefersReducedMotion });
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={(el) => {
        if (el) {
          contextRef.current = init(el, vs, fs);
        }
        return () => {
          contextRef.current = undefined;
        };
      }}
      css={styles.canvas}
    />
  );
}

const styles = stylex.create({
  canvas: {
    width: "100%",
    height: "100%",
    backgroundColor: color.background,
    willChange: {
      default: "transform",
      [motionConstants.REDUCED_MOTION]: null,
    },
    zIndex: layer.base,
  },
});
