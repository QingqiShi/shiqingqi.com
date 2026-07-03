import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { color, font, ratio, space } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import { Card } from "#src/components/shared/card.tsx";
import { svgTokens } from "#src/logos/svg.stylex.ts";

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
  className,
  style,
  ...rest
}: ExperienceCardProps) {
  return (
    <Card {...rest} className={className} style={style} css={styles.card}>
      <Suspense fallback={<Skeleton />}>
        <div css={styles.logo}>{logo}</div>
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
    gap: space._1,
    gridTemplateRows: "1fr auto",
    justifyContent: "flex-start",
    // Override svg css variables to be muted when not hovering
    [svgTokens.fill]: { ":not(:hover)": color.textMuted },
  },
  logo: {
    alignItems: "center",
    aspectRatio: ratio.double,
    display: "flex",
    width: "100%",
    maxInlineSize: space._13,
    justifyContent: "flex-start",
    minHeight: 0,
  },
  dates: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
});
