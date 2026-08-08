"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";

interface ThemeFrameProps {
  /** Theme to pin the frame to, regardless of the viewer's active theme. */
  scheme: "light" | "dark";
  /** Caption above the frame. Defaults to a localised "Light" / "Dark". */
  label?: string;
  children: ReactNode;
}

/**
 * Frames its children on a canvas locked to one theme by pinning `color-scheme`,
 * so every `light-dark()` token inside resolves to `scheme` no matter what the
 * surrounding page is set to. Useful for showing a component in both themes at
 * once (see {@link ThemeFramePair}).
 */
export function ThemeFrame({ scheme, label, children }: ThemeFrameProps) {
  // Resolve both defaults unconditionally so the label copy stays available in
  // either theme without a conditional t() call.
  const lightLabel = t({ en: "Light", zh: "浅色" });
  const darkLabel = t({ en: "Dark", zh: "深色" });
  const resolvedLabel = label ?? (scheme === "dark" ? darkLabel : lightLabel);
  return (
    <div
      css={[
        corner.radius_3,
        styles.frame,
        scheme === "dark" ? styles.dark : styles.light,
      ]}
    >
      <Text as="span" variant="caption" tone="subtle" css={styles.label}>
        {resolvedLabel}
      </Text>
      <div css={styles.canvas}>{children}</div>
    </div>
  );
}

interface ThemeFramePairProps {
  /**
   * Rendered once in a light frame and once in a dark frame — the same nodes
   * appear twice, so avoid hard-coded `id`s or other must-be-unique markup.
   */
  children: ReactNode;
  /** Overrides the light frame's caption. */
  lightLabel?: string;
  /** Overrides the dark frame's caption. */
  darkLabel?: string;
}

/**
 * Shows its children side by side in a light and a dark {@link ThemeFrame},
 * collapsing to a single column on narrow viewports. The children render twice.
 */
export function ThemeFramePair({
  children,
  lightLabel,
  darkLabel,
}: ThemeFramePairProps) {
  return (
    <div css={styles.pair}>
      <ThemeFrame scheme="light" label={lightLabel}>
        {children}
      </ThemeFrame>
      <ThemeFrame scheme="dark" label={darkLabel}>
        {children}
      </ThemeFrame>
    </div>
  );
}

const styles = stylex.create({
  frame: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._4,
    paddingInline: space._4,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  // Pinning color-scheme makes every light-dark() token inside resolve to the
  // chosen theme, independent of the viewer's setting.
  light: {
    colorScheme: "light",
  },
  dark: {
    colorScheme: "dark",
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: font.trackingWider,
    fontWeight: font.weight_6,
  },
  canvas: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    minInlineSize: 0,
  },
  pair: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "1fr 1fr" },
    gap: space._3,
  },
});
