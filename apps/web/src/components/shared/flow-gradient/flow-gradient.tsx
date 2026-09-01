"use client";

import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color, layer } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useResolvedTheme } from "#src/hooks/use-resolved-theme.ts";
import {
  createFlowGradientRenderer,
  type ColorOptions,
} from "./create-flow-gradient-renderer";
import fs from "./shaders/fs.glsl";
import vs from "./shaders/vs.glsl";

// Foreground gradient hues only. The background colour the gradient blends into
// is NOT defined here — it is read at runtime from the canvas's resolved
// `background-color` (color.bgCanvas, see styles.canvas) so it always matches
// the single token the page background uses, with no second copy to drift.
const DARK_COLORS = {} satisfies ColorOptions;

const LIGHT_COLORS = {
  colorTop: [0.6, 0.5, 0.7],
  colorBottom: [0.4, 0.4, 1],
  colorAltTop: [1, 0.3, 0.3],
  colorAltBottom: [1, 0.3, 0.3],
} satisfies ColorOptions;

/**
 * Resolve the canvas's computed `background-color` (which is `color.bgCanvas`)
 * to a normalised RGB triple for the shader's `u_colorBackground`, keeping the
 * gradient's base colour sourced from the same token as the page background.
 */
function readCanvasBackground(
  canvas: HTMLCanvasElement,
): [number, number, number] | undefined {
  const channels = getComputedStyle(canvas).backgroundColor.match(/[\d.]+/g);
  if (!channels || channels.length < 3) return undefined;
  return [
    Number(channels[0]) / 255,
    Number(channels[1]) / 255,
    Number(channels[2]) / 255,
  ];
}

export function FlowGradient() {
  const isDark = useResolvedTheme() === "dark";
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    false,
  );

  const colorsRef = useRef<ColorOptions>(isDark ? DARK_COLORS : LIGHT_COLORS);
  const rendererRef =
    useRef<ReturnType<typeof createFlowGradientRenderer>>(undefined);

  // Re-pick the hue preset and re-read the bgCanvas value whenever the resolved
  // theme flips. The <html> class is already correct here: `themeHack` set it
  // before hydration, and ThemeSwitch's layout effect sets it on later flips.
  useEffect(() => {
    const hues = isDark ? DARK_COLORS : LIGHT_COLORS;
    const canvas = rendererRef.current?.canvas;
    const colorBackground = canvas ? readCanvasBackground(canvas) : undefined;
    colorsRef.current = colorBackground ? { ...hues, colorBackground } : hues;
  }, [isDark]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    return renderer.start(colorsRef, { reducedMotion: prefersReducedMotion });
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={(el) => {
        if (el) {
          rendererRef.current = createFlowGradientRenderer(el, vs, fs);
        }
        return () => {
          rendererRef.current = undefined;
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
    backgroundColor: color.bgCanvas,
    willChange: {
      default: "transform",
      [motionConstants.REDUCED_MOTION]: null,
    },
    zIndex: layer.base,
  },
});
