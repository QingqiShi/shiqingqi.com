"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { SheetBoundary } from "@tuja/ui/components/sheet";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";

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
        css={[
          corner.radius_3,
          styles.frame,
          styles.size(size.inlineSize, size.blockSize),
        ]}
      >
        <EffectCarrier value="contained">{children}</EffectCarrier>
      </SheetBoundary>
    </div>
  );
}

/** The frame of a `DeviceFrame`, empty, while the page reads its URL. */
export function DeviceFramePlaceholder({ blockSize }: { blockSize: string }) {
  return (
    <div
      css={[corner.radius_3, styles.frame, styles.size("100%", blockSize)]}
    />
  );
}

const styles = stylex.create({
  toggle: {
    alignSelf: "center",
  },
  frame: {
    position: "relative",
    maxInlineSize: "100%",
    marginInline: "auto",
    overflow: "hidden",
    transform: "translateZ(0)",
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  size: (inlineSize: string, blockSize: string) => ({
    inlineSize,
    blockSize,
  }),
});
