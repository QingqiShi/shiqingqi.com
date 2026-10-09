import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, ratio, rhythm, space } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import { Card } from "#src/links/card.tsx";

interface ExperienceCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode;
  dates: string;
  /** ISO start date for the `<time dateTime>` attribute (e.g. "2021-08"). */
  dateTime: string;
}

export function ExperienceCard({
  logo,
  dates,
  dateTime,
  css,
  ...rest
}: ExperienceCardProps) {
  return (
    <Card {...rest} css={[styles.card, css]}>
      <Suspense fallback={<Skeleton />}>
        <div css={[flex.row, styles.logo]}>{logo}</div>
      </Suspense>
      <time dateTime={dateTime} css={[typeRole.label, styles.dates]}>
        {dates}
      </time>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    alignItems: "center",
    display: "grid",
    gap: rhythm.tight,
    gridTemplateRows: "1fr auto",
    justifyContent: "flex-start",
  },
  logo: {
    aspectRatio: ratio.double,
    width: "100%",
    maxInlineSize: space._13,
    minHeight: 0,
  },
  dates: {
    fontWeight: font.weight_6,
    color: color.fgMuted,
  },
});
