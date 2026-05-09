import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { color, font, space } from "#src/tokens.stylex.ts";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} css={styles.section}>
      <header css={styles.header}>
        <h2 css={styles.title}>{title}</h2>
        {description ? <p css={styles.description}>{description}</p> : null}
      </header>
      <div css={styles.body}>{children}</div>
    </section>
  );
}

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
    paddingBlock: space._6,
    scrollMarginTop: `calc(env(safe-area-inset-top) + ${space._10} + ${space._9})`,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  title: {
    margin: 0,
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "60ch",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
});
