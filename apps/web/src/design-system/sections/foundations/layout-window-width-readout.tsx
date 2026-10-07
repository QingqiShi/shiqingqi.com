"use client";

import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { t } from "#src/i18n.ts";

interface LayoutWindowWidthReadoutProps {
  /** The breakpoint bands, from narrowest to widest. */
  bands: readonly { label: string; min: number }[];
}

/** The window's width in px and the breakpoint band it falls in. */
export function LayoutWindowWidthReadout({
  bands,
}: LayoutWindowWidthReadoutProps) {
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
      : bands.findLast((band) => viewport >= band.min);

  return (
    <p css={[stack.tight, styles.marker]} aria-live="polite">
      <span css={styles.markerLabel}>
        {t({ en: "your window", zh: "你的窗口" })}
      </span>
      <span css={styles.markerValue}>
        {viewport === undefined ? (
          " "
        ) : (
          <>
            {`${viewport.toString()}px → `}
            <span css={styles.markerBand}>{active?.label}</span>
          </>
        )}
      </span>
    </p>
  );
}

const styles = stylex.create({
  marker: {
    margin: 0,
  },
  markerLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
    color: color.fgMuted,
  },
  markerValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.fg,
    fontVariantNumeric: "tabular-nums",
  },
  markerBand: {
    color: color.fgAccent,
    fontWeight: font.weight_6,
  },
});
