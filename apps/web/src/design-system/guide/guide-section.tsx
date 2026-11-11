import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { measure } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocSection } from "#src/design-system/doc-section.tsx";

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
      <Text tone="muted">{lead}</Text>
      {children}
    </DocSection>
  );
}

interface GuideNoteProps {
  children: ReactNode;
}

/** A qualification that follows an example — the exception, or the next layer. */
export function GuideNote({ children }: GuideNoteProps) {
  return (
    <Text look="bodySmall" tone="muted">
      {children}
    </Text>
  );
}

const styles = stylex.create({
  title: {
    maxInlineSize: measure.prose,
  },
});
