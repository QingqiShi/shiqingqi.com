import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useId, type ReactNode } from "react";
import { TitleAction } from "../shell/title-action.tsx";

interface ReportSectionProps {
  title: string;
  headingLevel: 2 | 3;
  /** A control at the end of the title's line. */
  action?: ReactNode;
  children: ReactNode;
}

/** One titled part of a report. */
export function ReportSection({
  title,
  headingLevel,
  action,
  children,
}: ReportSectionProps) {
  const headingId = useId();
  const heading = (
    <Heading id={headingId} level={headingLevel} look="h2">
      {title}
    </Heading>
  );
  return (
    <section aria-labelledby={headingId} css={stack.tight}>
      {action ? (
        <div css={[flex.between, styles.titleLine]}>
          {heading}
          <TitleAction>{action}</TitleAction>
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

const styles = stylex.create({
  titleLine: {
    gap: rhythm.tight,
  },
});
