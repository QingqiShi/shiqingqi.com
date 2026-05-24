import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

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
    backgroundColor: color.background1,
    border: `1px solid ${color.neutralBorder}`,
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
