import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { tokens } from "@/tokens.stylex";
import type { Breakpoints } from "@/types";
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

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const minMd: Breakpoints["minMd"] = "@media (min-width: 768px)";

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.7rem",
  },
  placeholder: {
    height: { default: "5.5rem", [sm]: "4.4rem", [minMd]: "3rem" },
  },
  dates: {
    fontSize: "0.6rem",
    fontWeight: 600,
    color: tokens.textMuted,
  },
});
