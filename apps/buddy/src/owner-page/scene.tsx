"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { safeArea, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode, Ref } from "react";
import { sceneHeight, sceneTokens } from "./scene.stylex.ts";
import { SvgMarkup } from "./svg-markup.tsx";

type SceneProps = {
  svg: string;
  /** What the scene shows, read aloud when it changes, as the pet's line does. */
  alt: string;
  tapLabel: string;
  onTap: () => void;
  ref: Ref<HTMLDivElement>;
  insetRef: Ref<HTMLDivElement>;
  css?: StyleProp;
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
  css,
  children,
}: SceneProps) {
  return (
    <div ref={ref} css={[styles.scene, css]}>
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
      <div aria-hidden css={styles.seam} />
      {children}
    </div>
  );
}

const styles = stylex.create({
  scene: {
    position: "relative",
    blockSize: {
      default: sceneHeight.phone,
      [breakpoints.md]: sceneHeight.wide,
    },
    overflow: "hidden",
  },
  // In dark mode the ground fades into the page, so that it does not stop
  // at a hard edge on the black page.
  seam: {
    position: "absolute",
    insetInline: 0,
    insetBlockEnd: 0,
    blockSize: space._5,
    backgroundImage: `linear-gradient(transparent, light-dark(transparent, ${sceneTokens.seamFade}))`,
    pointerEvents: "none",
  },
  // An empty box as tall as the status bar, so that the scene can measure it.
  inset: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: 0,
    blockSize: safeArea.blockStart,
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
