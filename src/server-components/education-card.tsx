import { Suspense } from "react";
import * as stylex from "@stylexjs/stylex";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { tokens } from "../tokens.stylex";
import type { Breakpoints } from "../types";
import { Card } from "./card";
import { Skeleton } from "./skeleton";
import { cardTokens } from "./card.stylex";

interface EducationCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode | { src: StaticImageData; alt: string };
  name: string;
  dates: string;
}

export function EducationCard({
  logo,
  name,
  dates,
  style,
  ...rest
}: EducationCardProps) {
  return (
    <Card {...rest} style={[styles.card, style]}>
      <div {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.logo)}>
          {typeof logo === "object" && logo && "src" in logo ? (
            <Image
              src={logo.src}
              alt={logo.alt}
              title={logo.alt}
              {...stylex.props(styles.img)}
            />
          ) : (
            <Suspense fallback={<Skeleton fill />}>{logo}</Suspense>
          )}
        </div>
        <span {...stylex.props(styles.name)}>{name}</span>
      </div>
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
    gap: "0.3rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  name: {
    fontSize: "0.8rem",
    fontWeight: 800,
    width: "60%",
    color: tokens.textMuted,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    width: "40%",
    height: { default: "9.375rem", [sm]: "7.2rem", [minMd]: "5rem" },
  },
  img: {
    height: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    filter: cardTokens.imageFilter,
    transition: "filter .2s",
  },
  dates: {
    fontSize: "0.6rem",
    fontWeight: 600,
    color: tokens.textMuted,
  },
});
