import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
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
    <div css={styles.bandWrap}>
      <div css={[corner.radius_2, styles.bandRow]}>
        {BANDS.map((band) => (
          <div key={band.label} css={[styles.band, bandLit[band.label]]}>
            <span css={[styles.bandLabel, labelLit[band.label]]}>
              {band.label}
            </span>
            <span css={styles.bandThreshold}>{band.threshold}</span>
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
  bandWrap: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  bandRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: space._00,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    backgroundColor: color.bgCanvas,
  },
  band: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._0,
    paddingBlock: space._2,
    paddingInline: space._1,
  },
  bandLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
  },
  bandThreshold: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.fgMuted,
    fontVariantNumeric: "tabular-nums",
  },
});

const bandLit = stylex.create({
  base: {
    backgroundColor: {
      default: color.bgAccentSubtle,
      [breakpoints.sm]: color.bgSurface,
    },
    boxShadow: {
      default: `inset 0 -2px 0 0 ${color.bgAccent}`,
      [breakpoints.sm]: "inset 0 -2px 0 0 transparent",
    },
  },
  sm: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.sm]: color.bgAccentSubtle,
      [breakpoints.md]: color.bgSurface,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.sm]: `inset 0 -2px 0 0 ${color.bgAccent}`,
      [breakpoints.md]: "inset 0 -2px 0 0 transparent",
    },
  },
  md: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.md]: color.bgAccentSubtle,
      [breakpoints.lg]: color.bgSurface,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.md]: `inset 0 -2px 0 0 ${color.bgAccent}`,
      [breakpoints.lg]: "inset 0 -2px 0 0 transparent",
    },
  },
  lg: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.lg]: color.bgAccentSubtle,
      [breakpoints.xl]: color.bgSurface,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.lg]: `inset 0 -2px 0 0 ${color.bgAccent}`,
      [breakpoints.xl]: "inset 0 -2px 0 0 transparent",
    },
  },
  xl: {
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.xl]: color.bgAccentSubtle,
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.xl]: `inset 0 -2px 0 0 ${color.bgAccent}`,
    },
  },
});

const labelLit = stylex.create({
  base: {
    color: {
      default: color.fgAccent,
      [breakpoints.sm]: color.fgMuted,
    },
  },
  sm: {
    color: {
      default: color.fgMuted,
      [breakpoints.sm]: color.fgAccent,
      [breakpoints.md]: color.fgMuted,
    },
  },
  md: {
    color: {
      default: color.fgMuted,
      [breakpoints.md]: color.fgAccent,
      [breakpoints.lg]: color.fgMuted,
    },
  },
  lg: {
    color: {
      default: color.fgMuted,
      [breakpoints.lg]: color.fgAccent,
      [breakpoints.xl]: color.fgMuted,
    },
  },
  xl: {
    color: {
      default: color.fgMuted,
      [breakpoints.xl]: color.fgAccent,
    },
  },
});
