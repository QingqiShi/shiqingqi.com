"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { font } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";

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
    <p css={[stack.text, styles.marker]}>
      <Text as="span" look="overline" tone="muted" css={styles.markerLabel}>
        {t({ en: "your window", zh: "你的窗口" })}
      </Text>
      <Text as="span" look="bodySmall" numeric css={styles.markerValue}>
        {viewport === undefined ? (
          "\u00A0"
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
  marker: {
    margin: 0,
  },
  markerLabel: {
    fontFamily: font.familyMono,
  },
  markerValue: {
    fontFamily: font.familyMono,
  },
  markerBand: {
    fontWeight: font.weight_6,
  },
});
