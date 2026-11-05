"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { SheetBoundary } from "@tuja/ui/components/sheet";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { breakoutBox } from "#src/design-system/reading-column.stylex.ts";

/** One width a `DeviceFrame` can take. */
export interface DeviceFrameSize<TValue extends string> {
  value: TValue;
  label: string;
  /** The width of the frame, capped at the width of the page. */
  inlineSize: string;
  blockSize: string;
}

interface DeviceFrameProps<TValue extends string> {
  /** Names the control that picks the width. */
  label: string;
  sizes: readonly DeviceFrameSize<TValue>[];
  children: ReactNode;
}

/**
 * A live app in a frame of a width the reader picks, so that a shell that
 * fits itself to its own width shows each of its forms without a resize of
 * the window.
 */
export function DeviceFrame<TValue extends string>({
  label,
  sizes,
  children,
}: DeviceFrameProps<TValue>) {
  const [value, setValue] = useState(sizes[0].value);
  const size = sizes.find((item) => item.value === value) ?? sizes[0];
  return (
    <div css={stack.item}>
      <SegmentedControl
        aria-label={label}
        size="sm"
        options={sizes.map((item) => ({
          value: item.value,
          label: item.label,
        }))}
        value={value}
        onChange={setValue}
        css={styles.toggle}
      />
      {/* The transform makes the frame the containing block of a fixed box,
          such as a tab bar, so it floats at the bottom of the frame and not
          of the screen. A sheet opens in the frame too. */}
      <SheetBoundary
        css={[styles.frame, styles.size(size.inlineSize, size.blockSize)]}
      >
        <EffectCarrier value="contained">{children}</EffectCarrier>
        <span aria-hidden css={styles.edge} />
      </SheetBoundary>
    </div>
  );
}

/**
 * Spans the page instead of the reading column, so that a frame has the room
 * for each form of its shell, and its caption and code keep to its edges.
 */
export function FrameBreakout({ children }: { children: ReactNode }) {
  return <div css={[stack.item, styles.breakout]}>{children}</div>;
}

/** The frame of a `DeviceFrame`, empty, while the page reads its URL. */
export function DeviceFramePlaceholder({ blockSize }: { blockSize: string }) {
  return (
    <div
      css={[styles.frame, styles.edgeOnBox, styles.size("100%", blockSize)]}
    />
  );
}

const styles = stylex.create({
  breakout: {
    boxSizing: "border-box",
    inlineSize: breakoutBox.inlineSize,
    marginInlineStart: breakoutBox.marginInlineStart,
  },
  // Below this width each size of the frame fills the page, so the control
  // changes nothing.
  toggle: {
    alignSelf: "center",
    display: { default: null, "@media (max-width: 28rem)": "none" },
  },
  frame: {
    position: "relative",
    maxInlineSize: "100%",
    marginInline: "auto",
    overflow: "hidden",
    transform: "translateZ(0)",
    borderRadius: border.radius_3,
    cornerShape: "round",
    backgroundColor: color.bgCanvas,
  },
  // The columns of a shell fill the frame and cover its own box, so the edge is
  // a box over them.
  edge: {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    cornerShape: "inherit",
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.border}`,
    pointerEvents: "none",
  },
  edgeOnBox: {
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.border}`,
  },
  size: (inlineSize: string, blockSize: string) => ({
    inlineSize,
    blockSize,
  }),
});
