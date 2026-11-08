"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import type { ReactNode, Ref } from "react";
import { SvgMarkup } from "./svg-markup.tsx";

type SceneProps = {
  svg: string;
  /** What the scene shows, read aloud when it changes, as the pet's line does. */
  alt: string;
  tapLabel: string;
  onTap: () => void;
  ref: Ref<HTMLDivElement>;
  insetRef: Ref<HTMLDivElement>;
  /** The corner marks, laid over the scene. */
  children?: ReactNode;
};

/**
 * The pet's window, from the top edge of the screen down: the sky runs under the status bar, and
 * a tap anywhere on it pats the pet.
 */
export function Scene({
  svg,
  alt,
  tapLabel,
  onTap,
  ref,
  insetRef,
  children,
}: SceneProps) {
  return (
    <div ref={ref} css={styles.scene}>
      <div ref={insetRef} aria-hidden css={styles.inset} />
      <div aria-live="polite" css={a11y.srOnly}>
        {alt}
      </div>
      <button
        type="button"
        aria-label={tapLabel}
        onClick={onTap}
        css={[buttonReset.base, styles.tap, a11y.focusRingInset]}
      >
        <span aria-hidden css={styles.drawing}>
          <SvgMarkup markup={svg} />
        </span>
      </button>
      {children}
    </div>
  );
}

const styles = stylex.create({
  scene: {
    position: "relative",
    blockSize: {
      default: `calc(env(safe-area-inset-top) + clamp(20rem, 48svh, 26rem))`,
      [breakpoints.md]: `calc(env(safe-area-inset-top) + clamp(22rem, 48svh, 30rem))`,
    },
    overflow: "hidden",
  },
  // An empty box as tall as the status bar, so that the scene can measure it.
  inset: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: 0,
    blockSize: "env(safe-area-inset-top)",
    visibility: "hidden",
    pointerEvents: "none",
  },
  tap: {
    // `buttonReset.base` sets the position under a coarse pointer, which ranks
    // above a plain value, so the branch repeats it.
    position: { default: "absolute", [pointer.coarse]: "absolute" },
    inset: 0,
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
    lineHeight: 0,
  },
  drawing: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
  },
});
