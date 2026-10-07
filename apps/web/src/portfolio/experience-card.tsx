import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, font, ratio, rhythm, space } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import { svgTokens } from "#src/brand/svg.stylex.ts";
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
      <time dateTime={dateTime} css={styles.dates}>
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
    // Override svg css variables to be muted when not hovering
    [svgTokens.fill]: { ":not(:hover)": color.fgMuted },
  },
  logo: {
    aspectRatio: ratio.double,
    width: "100%",
    maxInlineSize: space._13,
    minHeight: 0,
  },
  dates: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.fgMuted,
  },
});
