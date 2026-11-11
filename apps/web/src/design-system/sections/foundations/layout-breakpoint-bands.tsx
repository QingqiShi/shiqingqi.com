import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import { gridlineTokens } from "#src/design-system/gridline-ground.stylex.ts";
import { LayoutWindowWidthReadout } from "./layout-window-width-readout.tsx";

// Breakpoint thresholds, transcribed once from breakpoints.stylex.ts so the band
// cutoffs and the labels can't drift within this file. `xl` gates the widest
// desktops; below `sm` is the shared mobile base.
const BANDS = [
  { label: "base", min: 0, threshold: "< 320" },
  { label: "sm", min: 320, threshold: "≥ 320" },
  { label: "md", min: 768, threshold: "≥ 768" },
  { label: "lg", min: 1080, threshold: "≥ 1080" },
  { label: "xl", min: 2000, threshold: "≥ 2000" },
] as const;

/** The breakpoint ladder, with the band that matches the window lit. */
export function LayoutBreakpointBands() {
  return (
    <div css={stack.item}>
      <div css={[corner.radius_2, styles.bandRow]}>
        {BANDS.map((band) => (
          <div key={band.label} css={[styles.band, bandLit[band.label]]}>
            <span
              css={[typeRole.caption, styles.bandLabel, labelLit[band.label]]}
            >
              {band.label}
            </span>
            <Text
              as="span"
              look="caption"
              tone="muted"
              numeric
              css={styles.bandThreshold}
            >
              {band.threshold}
            </Text>
          </div>
        ))}
      </div>
      <LayoutWindowWidthReadout
        bands={BANDS.map(({ label, min }) => ({ label, min }))}
      />
    </div>
  );
}

const styles = stylex.create({
  bandRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: gridlineTokens.width,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    backgroundColor: color.background,
  },
  band: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingBlock: space._2,
    paddingInline: space._1,
  },
  bandLabel: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
  },
  bandThreshold: {
    fontFamily: font.familyMono,
  },
});

const bandLit = stylex.create({
  base: {
    backgroundColor: {
      default: color.muted,
      [breakpoints.sm]: color.card,
    },
    boxShadow: {
      default: `inset 0 -2px 0 0 ${color.foreground}`,
      [breakpoints.sm]: "inset 0 -2px 0 0 transparent",
    },
  },
  sm: {
    backgroundColor: {
      default: color.card,
      [breakpoints.sm]: color.muted,
      [breakpoints.md]: color.card,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.sm]: `inset 0 -2px 0 0 ${color.foreground}`,
      [breakpoints.md]: "inset 0 -2px 0 0 transparent",
    },
  },
  md: {
    backgroundColor: {
      default: color.card,
      [breakpoints.md]: color.muted,
      [breakpoints.lg]: color.card,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.md]: `inset 0 -2px 0 0 ${color.foreground}`,
      [breakpoints.lg]: "inset 0 -2px 0 0 transparent",
    },
  },
  lg: {
    backgroundColor: {
      default: color.card,
      [breakpoints.lg]: color.muted,
      [breakpoints.xl]: color.card,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.lg]: `inset 0 -2px 0 0 ${color.foreground}`,
      [breakpoints.xl]: "inset 0 -2px 0 0 transparent",
    },
  },
  xl: {
    backgroundColor: {
      default: color.card,
      [breakpoints.xl]: color.muted,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.xl]: `inset 0 -2px 0 0 ${color.foreground}`,
    },
  },
});

const labelLit = stylex.create({
  base: {
    color: {
      default: color.foreground,
      [breakpoints.sm]: color.mutedForeground,
    },
  },
  sm: {
    color: {
      default: color.mutedForeground,
      [breakpoints.sm]: color.foreground,
      [breakpoints.md]: color.mutedForeground,
    },
  },
  md: {
    color: {
      default: color.mutedForeground,
      [breakpoints.md]: color.foreground,
      [breakpoints.lg]: color.mutedForeground,
    },
  },
  lg: {
    color: {
      default: color.mutedForeground,
      [breakpoints.lg]: color.foreground,
      [breakpoints.xl]: color.mutedForeground,
    },
  },
  xl: {
    color: {
      default: color.mutedForeground,
      [breakpoints.xl]: color.foreground,
    },
  },
});
