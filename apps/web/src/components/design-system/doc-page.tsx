import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface DocPageProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
}

/**
 * Shared header + body frame for a single design-system entry (one foundation
 * or component per route). Renders the page-level `h1` and intro, then a
 * consistent content column the showcases flow into.
 */
export function DocPage({ title, description, children }: DocPageProps) {
  return (
    <article css={styles.page}>
      <header css={styles.header}>
        <h1 css={styles.title}>{title}</h1>
        <p css={styles.description}>{description}</p>
      </header>
      <div css={styles.body}>{children}</div>
    </article>
  );
}

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: space._6,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  title: {
    margin: 0,
    fontSize: font.uiSubDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
    color: color.textMain,
    textWrap: "balance",
  },
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "65ch",
    textWrap: "pretty",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
});
