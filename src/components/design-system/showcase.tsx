import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

interface ShowcaseProps {
  label?: string;
  children: ReactNode;
}

export function Showcase({ label, children }: ShowcaseProps) {
  return (
    <div css={styles.showcase}>
      {label ? <span css={styles.label}>{label}</span> : null}
      <div css={styles.body}>{children}</div>
    </div>
  );
}

interface ShowcaseGridProps {
  children: ReactNode;
}

export function ShowcaseGrid({ children }: ShowcaseGridProps) {
  return <div css={styles.grid}>{children}</div>;
}

interface ShowcaseItemProps {
  label: string;
  children: ReactNode;
}

export function ShowcaseItem({ label, children }: ShowcaseItemProps) {
  return (
    <div css={[flex.col, styles.item]}>
      <div css={styles.itemPreview}>{children}</div>
      <span css={styles.itemLabel}>{label}</span>
    </div>
  );
}

const styles = stylex.create({
  showcase: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    padding: space._5,
    backgroundColor: color.backgroundRaised,
    border: `1px solid ${color.borderSubtle}`,
    borderRadius: border.radius_3,
  },
  label: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    fontWeight: font.weight_6,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: space._3,
  },
  item: {
    gap: space._2,
  },
  itemPreview: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  itemLabel: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
});
