"use client";

import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { duration, easing } from "@tuja/ui/primitives/motion.stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  controlHeight,
  controlSize,
  font,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Link } from "#src/links/link.tsx";
import { sceneInk } from "#src/pet/scene-ink.stylex.ts";

type Side = "start" | "end";

/** A small link in a corner of the scene, such as the wordmark that leads home. */
export function CornerLink({
  side,
  href,
  isWordmark = false,
  children,
}: {
  side: Side;
  href: string;
  isWordmark?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      {...stylex.props(
        a11y.touchTarget,
        a11y.focusRing,
        typeRole.label,
        styles.mark,
        sides[side],
        isWordmark && styles.wordmark,
      )}
    >
      {children}
    </Link>
  );
}

/** A small icon button in a corner of the scene, named by `label`. */
export function CornerButton({
  side,
  label,
  onClick,
  children,
}: {
  side: Side;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      css={[buttonReset.base, styles.mark, sides[side], styles.icon]}
    >
      {children}
    </button>
  );
}

const styles = stylex.create({
  mark: {
    // `a11y.touchTarget` and `buttonReset.base` set the position under a
    // coarse pointer, which ranks above a plain value, so the branch repeats it.
    position: { default: "absolute", [pointer.coarse]: "absolute" },
    insetBlockStart: `calc(env(safe-area-inset-top) + ${space._2})`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.inline,
    minBlockSize: controlHeight.sm,
    minInlineSize: controlHeight.sm,
    paddingInline: space._2,
    color: sceneInk.paper,
    textDecoration: "none",
    borderRadius: border.radius_round,
    cornerShape: "round",
    backgroundColor: {
      default: sceneInk.markFill,
      ":hover": { default: null, [pointer.canHover]: sceneInk.markFillPressed },
      ":active": {
        default: sceneInk.markFillPressed,
        [pointer.canHover]: sceneInk.markFillPressed,
      },
    },
    backdropFilter: "blur(10px)",
    transition: `background-color ${duration._200} ${easing.ease}`,
  },
  wordmark: {
    fontWeight: font.weight_6,
  },
  icon: {
    paddingInline: 0,
    fontSize: controlSize._5,
  },
});

const sides = stylex.create({
  start: { insetInlineStart: pageGutter.inlineStart },
  end: { insetInlineEnd: pageGutter.inlineEnd },
});
