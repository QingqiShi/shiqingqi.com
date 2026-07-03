import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface ShowcaseProps {
  label?: string;
  /**
   * Section framing. `"card"` (default) wraps the section in a raised surface —
   * the treatment shared across the design-system doc pages. `"plain"` drops the
   * card chrome so the section reads from its heading and surrounding spacing
   * alone, letting inner surfaces carry the emphasis instead. The colour page
   * pilots `"plain"`; other pages keep the card default untouched.
   */
  frame?: "card" | "plain";
  children: ReactNode;
}

export function Showcase({ label, frame = "card", children }: ShowcaseProps) {
  const plain = frame === "plain";
  return (
    <section css={[styles.showcase, plain ? styles.plainFrame : styles.card]}>
      {label ? (
        <h2 css={plain ? styles.headingPlain : styles.label}>{label}</h2>
      ) : null}
      <div css={styles.body}>{children}</div>
    </section>
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
  },
  // Default doc-page framing: a raised surface card.
  card: {
    padding: space._5,
    backgroundColor: color.bgSurface,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_3,
  },
  // Plain framing: no card chrome. The section is delineated by its heading and
  // the generous gap the doc-page body puts between siblings, so the page canvas
  // stays the ground and inner surfaces do the highlighting.
  plainFrame: {
    gap: space._4,
  },
  label: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    fontWeight: font.weight_6,
  },
  headingPlain: {
    margin: 0,
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
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
