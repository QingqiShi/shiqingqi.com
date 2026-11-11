"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { gridlineTokens } from "#src/design-system/gridline-ground.stylex.ts";

// The thresholds come from breakpoints.stylex.ts, and the sizes from
// typeRole.fluidDisplay and the font.vp* tokens. The page shows all four steps
// at once, but the computed style gives only the step of the live viewport,
// so the values are copied here. Keep them in sync.
const STEPS = [
  { label: "base", min: 0, threshold: "< 320", size: 2 },
  { label: "sm", min: 320, threshold: "≥ 320", size: 2.8 },
  { label: "md", min: 768, threshold: "≥ 768", size: 3.75 },
  { label: "lg", min: 1080, threshold: "≥ 1080", size: 5.25 },
] as const;

const FLUID_DISPLAY_WEIGHT = 600;

/** fluidDisplay at each breakpoint, with the step of the window lit. */
export function ViewportScaleSpecimen() {
  return (
    <div css={stack.item}>
      <div css={styles.strip}>
        {STEPS.map((step) => (
          <div key={step.label} css={[stack.tight, styles.cell]}>
            <span
              aria-hidden="true"
              css={[
                styles.glyph,
                textLit[step.label],
                styles.glyphSize(
                  `${step.size.toString()}rem`,
                  FLUID_DISPLAY_WEIGHT,
                ),
              ]}
            >
              Ag
            </span>
            <Text
              as="span"
              look="caption"
              tone="muted"
              numeric
              css={styles.mono}
            >
              {`${step.size.toString()}rem`}
            </Text>
          </div>
        ))}
        <div css={[corner.radius_2, styles.bandRow]}>
          {STEPS.map((step) => (
            <div key={step.label} css={[styles.band, bandLit[step.label]]}>
              <span
                css={[typeRole.caption, styles.bandLabel, textLit[step.label]]}
              >
                {step.label}
              </span>
              <Text
                as="span"
                look="caption"
                tone="muted"
                numeric
                css={styles.mono}
              >
                {step.threshold}
              </Text>
            </div>
          ))}
        </div>
      </div>
      <WindowWidthReadout />
    </div>
  );
}

function WindowWidthReadout() {
  const [viewport, setViewport] = useState<number | undefined>(undefined);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      setViewport(window.innerWidth);
    };
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  const active =
    viewport === undefined
      ? undefined
      : STEPS.findLast((step) => viewport >= step.min);

  return (
    <p css={[stack.text, styles.marker]}>
      <Text as="span" look="overline" tone="muted" css={styles.mono}>
        {t({ en: "your window", zh: "你的窗口" })}
      </Text>
      <Text as="span" look="bodySmall" numeric css={styles.markerValue}>
        {viewport === undefined ? (
          " "
        ) : (
          <>
            {`${viewport.toString()}px → `}
            <span css={styles.markerBand}>{active?.label}</span>
          </>
        )}
      </Text>
    </p>
  );
}

const styles = stylex.create({
  strip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(min-content, 1fr))",
    columnGap: rhythm.inline,
    rowGap: rhythm.tight,
  },
  cell: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  glyph: {
    lineHeight: font.lineHeight_0,
  },
  glyphSize: (fontSize: string, fontWeight: number) => ({
    fontSize,
    fontWeight,
  }),
  mono: {
    fontFamily: font.familyMono,
  },
  bandRow: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    columnGap: gridlineTokens.width,
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
  marker: {
    margin: 0,
  },
  markerValue: {
    fontFamily: font.familyMono,
  },
  markerBand: {
    fontWeight: font.weight_6,
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
    },
    boxShadow: {
      default: "inset 0 -2px 0 0 transparent",
      [breakpoints.lg]: `inset 0 -2px 0 0 ${color.foreground}`,
    },
  },
});

const textLit = stylex.create({
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
    },
  },
});
