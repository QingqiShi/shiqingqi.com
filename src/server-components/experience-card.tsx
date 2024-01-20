import { Suspense } from "react";
import * as x from "@stylexjs/stylex";
import type { Breakpoints } from "../types";
import { tokens } from "../app/tokens.stylex";
import { Card } from "./card";

interface ExperienceCardProps extends React.ComponentProps<typeof Card> {
  dates: string;
  logo?: React.ReactNode;
}

export function ExperienceCard({ dates, logo, ...rest }: ExperienceCardProps) {
  return (
    <Card {...rest}>
      {logo && (
        <Suspense fallback={<div {...x.props(styles.placeholder)} />}>
          <div {...x.props(styles.logo)}>{logo}</div>
        </Suspense>
      )}
      <time {...x.props(styles.dates)}>{dates}</time>
    </Card>
  );
}

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const minMd: Breakpoints["minMd"] = "@media (min-width: 768px)";

const styles = x.create({
  placeholder: {
    height: { default: "5.5rem", [sm]: "4.4rem", [minMd]: "3rem" },
  },
  logo: {
    marginBottom: "0.5rem",
  },
  dates: {
    fontSize: "0.6rem",
    fontWeight: 600,
    color: tokens.textMuted,
  },
});
