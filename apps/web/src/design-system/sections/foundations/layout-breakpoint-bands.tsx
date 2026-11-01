import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
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
            <span
              css={[
                typeRole.caption,
                typeModifier.numeric,
                styles.bandThreshold,
              ]}
            >
              {band.threshold}
            </span>
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
    backgroundColor: color.bgCanvas,
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
    color: color.fgMuted,
  },
});

const bandLit = stylex.create({
  base: {
    backgroundColor: {
      default: color.bgNeutralSubtle,
      [breakpoints.sm]: color.bgSurface,
    },
    boxShadow: {
      default: `inset 0 -2px 0 0 ${color.fg}`,
      [breakpoints.sm]: "inset 0 -2px 0 0 transparent",
    },
  },
  sm: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.sm]: color.bgNeutralSubtle,
      [breakpoints.md]: color.bgSurface,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.sm]: `inset 0 -2px 0 0 ${color.fg}`,
      [breakpoints.md]: "inset 0 -2px 0 0 transparent",
    },
  },
  md: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.md]: color.bgNeutralSubtle,
      [breakpoints.lg]: color.bgSurface,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.md]: `inset 0 -2px 0 0 ${color.fg}`,
      [breakpoints.lg]: "inset 0 -2px 0 0 transparent",
    },
  },
  lg: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.lg]: color.bgNeutralSubtle,
      [breakpoints.xl]: color.bgSurface,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.lg]: `inset 0 -2px 0 0 ${color.fg}`,
      [breakpoints.xl]: "inset 0 -2px 0 0 transparent",
    },
  },
  xl: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.xl]: color.bgNeutralSubtle,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.xl]: `inset 0 -2px 0 0 ${color.fg}`,
    },
  },
});

const labelLit = stylex.create({
  base: {
    color: {
      default: color.fg,
      [breakpoints.sm]: color.fgMuted,
    },
  },
  sm: {
    color: {
      default: color.fgMuted,
      [breakpoints.sm]: color.fg,
      [breakpoints.md]: color.fgMuted,
    },
  },
  md: {
    color: {
      default: color.fgMuted,
      [breakpoints.md]: color.fg,
      [breakpoints.lg]: color.fgMuted,
    },
  },
  lg: {
    color: {
      default: color.fgMuted,
      [breakpoints.lg]: color.fg,
      [breakpoints.xl]: color.fgMuted,
    },
  },
  xl: {
    color: {
      default: color.fgMuted,
      [breakpoints.xl]: color.fg,
    },
  },
});
