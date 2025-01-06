import * as stylex from "@stylexjs/stylex";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Suspense } from "react";
import { svgTokens } from "@/logos/svg.stylex";
import { Card } from "@/server-components/shared/card";
import { cardTokens } from "@/server-components/shared/card.stylex";
import { Skeleton } from "@/server-components/shared/skeleton";
import { color, font, ratio, space } from "@/tokens.stylex";

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
    aspectRatio: ratio.tv,
    alignItems: "center",
    display: "grid",
    gap: space._1,
    gridTemplateRows: "1fr auto",
    justifyContent: "flex-start",

    // Override svg css variables to be muted when not hovering
    [svgTokens.fill]: { ":not(:hover)": color.textMuted },
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
  name: {
    fontSize: font.size_0,
    fontWeight: font.weight_7,
    width: "60%",
    color: color.textMuted,
  },
  logo: {
    alignItems: "center",
    aspectRatio: ratio.square,
    display: "flex",
    justifyContent: "flex-start",
    minHeight: 0,
    width: "40%",
  },
  img: {
    height: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    filter: cardTokens.imageFilter,
    transition: "filter .2s",
  },
  dates: {
    fontSize: font.size_00,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
});
