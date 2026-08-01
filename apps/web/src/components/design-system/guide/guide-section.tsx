import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { measure } from "../measure.stylex.ts";

interface GuideSectionProps {
  title: string;
  /** The rule, in one or two sentences. Carries the section on its own. */
  lead: string;
  children: ReactNode;
}

/**
 * One rule on a guidance page: a heading, the rule stated in body copy, then
 * the examples that demonstrate it. Unlike `Showcase`, the text is the primary
 * content rather than a caption, so it sits at body size above the specimens.
 */
export function GuideSection({ title, lead, children }: GuideSectionProps) {
  return (
    <section css={styles.section}>
      <div css={styles.head}>
        <h2 css={styles.title}>{title}</h2>
        <p css={styles.lead}>{lead}</p>
      </div>
      <div css={styles.body}>{children}</div>
    </section>
  );
}

interface GuideNoteProps {
  children: ReactNode;
}

/** A qualification that follows an example — the exception, or the next layer. */
export function GuideNote({ children }: GuideNoteProps) {
  return <p css={styles.note}>{children}</p>;
}

const styles = stylex.create({
  // No rule between sections: the heading step and this much space already say
  // where one rule ends and the next begins.
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    paddingBlockStart: space._8,
  },
  head: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    maxInlineSize: measure.prose,
  },
  title: {
    margin: 0,
    fontSize: font.uiHeading1,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_2,
    color: color.textMain,
    textWrap: "balance",
  },
  lead: {
    margin: 0,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    textWrap: "pretty",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  note: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
