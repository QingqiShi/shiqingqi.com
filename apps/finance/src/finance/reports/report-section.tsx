import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, type ReactNode } from "react";

interface ReportSectionProps {
  title: string;
  headingLevel: 2 | 3;
  children: ReactNode;
}

/** One titled part of a Report. */
export function ReportSection({
  title,
  headingLevel,
  children,
}: ReportSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} css={stack.item}>
      <Heading id={headingId} level={headingLevel} look="h4">
        {title}
      </Heading>
      {children}
    </section>
  );
}
