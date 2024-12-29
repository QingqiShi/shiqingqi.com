import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { tokens } from "@/tokens.stylex";
import { Card } from "./card";
import { Skeleton } from "./skeleton";

interface ExperienceCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode;
  dates: string;
}

export function ExperienceCard({
  logo,
  dates,
  style,
  ...rest
}: ExperienceCardProps) {
  return (
    <Card {...rest} style={[styles.card, style]}>
      <Suspense fallback={<Skeleton style={styles.placeholder} />}>
        {logo}
      </Suspense>
      <time {...stylex.props(styles.dates)}>{dates}</time>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.7rem",
  },
  placeholder: {
    height: {
      default: "5.5rem",
      [breakpoints.sm]: "4.4rem",
      [breakpoints.md]: "3rem",
    },
  },
  dates: {
    fontSize: "0.6rem",
    fontWeight: 600,
    color: tokens.textMuted,
  },
});
