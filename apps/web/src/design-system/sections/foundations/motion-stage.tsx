import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

const DOT = space._7;

interface MotionStageProps {
  /** The name of what animates the dot, in code. */
  name: string;
  /** What the dot does, for the motion the reader's system asks for. */
  caption: string;
  /** Whether to draw the rail and the ring that show where the dot goes. */
  hasPath?: boolean;
  /** The moving part: a `MotionDot`, or anything as tall as one. */
  children: ReactNode;
}

/**
 * A rail with the dot at its start and a ring at its end, so the stage shows
 * where the dot goes before it moves.
 */
export function MotionStage({
  name,
  caption,
  hasPath = true,
  children,
}: MotionStageProps) {
  return (
    <li css={[stack.tight, styles.stage]}>
      <span css={styles.lane}>
        {hasPath ? (
          <>
            <span css={styles.rail} aria-hidden />
            <span css={[corner.radius_round, styles.ring]} aria-hidden />
          </>
        ) : null}
        {children}
      </span>
      <span css={stack.text}>
        <span css={[typeRole.caption, styles.name]}>{name}</span>
        <span css={[typeRole.caption, styles.caption]}>{caption}</span>
      </span>
    </li>
  );
}

interface MotionDotProps {
  isAcross: boolean;
  /** The transition or animation that moves the dot. */
  motion: StyleProp;
}

/** At rest a solid dot at the start of the rail. Across, a ring at its end. */
export function MotionDot({ isAcross, motion }: MotionDotProps) {
  return (
    <span
      aria-hidden
      css={[corner.radius_round, styles.dot, motion, isAcross && styles.across]}
    />
  );
}

const styles = stylex.create({
  stage: {
    minInlineSize: 0,
  },
  // The dot reads the width of the lane through `cqi`, so a resize needs no new pose.
  lane: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    blockSize: DOT,
    containerType: "inline-size",
  },
  rail: {
    position: "absolute",
    insetInline: `calc(${DOT} / 2)`,
    insetBlockStart: "50%",
    blockSize: "1px",
    backgroundColor: color.border,
  },
  ring: {
    position: "absolute",
    insetInlineEnd: 0,
    inlineSize: DOT,
    blockSize: DOT,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1.5px ${color.borderControl}`,
  },
  dot: {
    position: "relative",
    inlineSize: DOT,
    blockSize: DOT,
    backgroundColor: color.fg,
    boxShadow: `inset 0 0 0 2px ${color.fg}`,
    transform: "translateX(0)",
  },
  across: {
    backgroundColor: color.bgCanvas,
    transform: `translateX(calc(100cqi - ${DOT}))`,
  },
  name: {
    fontFamily: font.familyMono,
    color: color.fg,
    overflowWrap: "anywhere",
  },
  caption: {
    color: color.fgMuted,
  },
});
