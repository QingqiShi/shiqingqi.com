import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { Card } from "#src/components/shared/card.tsx";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { svgTokens } from "#src/logos/svg.stylex.ts";
import { color, font, ratio, space } from "#src/tokens.stylex.ts";

interface ExperienceCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode;
  dates: string;
}

export function ExperienceCard({
  logo,
  dates,
  className,
  style,
  ...rest
}: ExperienceCardProps) {
  return (
    <Card {...rest} className={className} style={style} css={styles.card}>
      <Suspense fallback={<Skeleton />}>
        <div css={styles.logo}>{logo}</div>
      </Suspense>
      <time css={styles.dates}>{dates}</time>
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
