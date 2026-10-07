import * as stylex from "@stylexjs/stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocSection } from "#src/design-system/doc-section.tsx";
import { measure } from "#src/design-system/measure.stylex.ts";

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
    <DocSection title={title} titleCss={[typeRole.h1, styles.title]}>
      <p css={[typeRole.body, styles.lead]}>{lead}</p>
      {children}
    </DocSection>
  );
}

interface GuideNoteProps {
  children: ReactNode;
}

/** A qualification that follows an example — the exception, or the next layer. */
export function GuideNote({ children }: GuideNoteProps) {
  return <p css={[typeRole.bodySmall, styles.note]}>{children}</p>;
}

const styles = stylex.create({
  title: {
    maxInlineSize: measure.prose,
    color: color.fg,
    textWrap: "balance",
  },
  lead: {
    margin: 0,
    maxInlineSize: measure.prose,
    color: color.fgMuted,
    textWrap: "pretty",
  },
  note: {
    margin: 0,
    color: color.fgMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
