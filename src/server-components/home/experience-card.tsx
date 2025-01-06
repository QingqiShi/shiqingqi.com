import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { svgTokens } from "@/logos/svg.stylex";
import { Card } from "@/server-components/shared/card";
import { Skeleton } from "@/server-components/shared/skeleton";
import { color, font, ratio, space } from "@/tokens.stylex";

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
    height: "100%",
    justifyContent: "flex-start",
    minHeight: 0,
  },
  dates: {
    fontSize: font.size_00,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
});
