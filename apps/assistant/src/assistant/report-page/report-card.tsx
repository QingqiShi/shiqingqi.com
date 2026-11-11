import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { useId, type ReactNode } from "react";

interface ReportCardProps {
  title: string;
  headingLevel: 2 | 3;
  children: ReactNode;
}

/** One titled part of a report, on a card of its own. */
export function ReportCard({ title, headingLevel, children }: ReportCardProps) {
  const headingId = useId();
  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle id={headingId} level={headingLevel}>
          {title}
        </CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}
