import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface TypeSampleProps {
  label: string;
  meta?: string;
  sizeStyle: StyleXStyles;
  children: ReactNode;
}

export function TypeSample({
  label,
  meta,
  sizeStyle,
  children,
}: TypeSampleProps) {
  return (
    <div css={styles.row}>
      <div css={styles.labelRow}>
        <span css={styles.label}>{label}</span>
        {meta ? <span css={styles.meta}>{meta}</span> : null}
      </div>
      <span css={[styles.sample, sizeStyle]}>{children}</span>
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  labelRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: space._2,
    rowGap: space._00,
  },
  label: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    fontFamily: font.familyMono,
  },
  meta: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  sample: {
    color: color.textMain,
    lineHeight: font.lineHeight_2,
  },
});
