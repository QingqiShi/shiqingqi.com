import * as stylex from "@stylexjs/stylex";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { tokens } from "@/tokens.stylex";
import { Card } from "./card";
import { cardTokens } from "./card.stylex";
import { Skeleton } from "./skeleton";

interface EducationCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode | { src: StaticImageData; alt: string };
  name: string;
  dates: string;
}

export function EducationCard({
  logo,
  name,
  dates,
  className,
  style,
  ...rest
}: EducationCardProps) {
  return (
    <Card {...rest} className={className} style={style} css={styles.card}>
      <div css={styles.row}>
        <div css={styles.logo}>
          {typeof logo === "object" && logo && "src" in logo ? (
            <Image
              src={logo.src}
              alt={logo.alt}
              title={logo.alt}
              css={styles.img}
            />
          ) : (
            <Suspense fallback={<Skeleton fill />}>{logo}</Suspense>
          )}
        </div>
        <span css={styles.name}>{name}</span>
      </div>
      <time css={styles.dates}>{dates}</time>
    </Card>
  );
}

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
    height: {
      default: "9.375rem",
      [breakpoints.sm]: "7.2rem",
      [breakpoints.md]: "5rem",
    },
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
