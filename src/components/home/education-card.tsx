import * as stylex from "@stylexjs/stylex";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Suspense } from "react";
import { cardTokens } from "#src/components/shared/card.stylex.ts";
import { Card } from "#src/components/shared/card.tsx";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { svgTokens } from "#src/logos/svg.stylex.ts";
import { color, font, ratio, space } from "#src/tokens.stylex.ts";

interface EducationCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode | { src: StaticImageData; alt: string };
  name: string;
  nameSubText?: string;
  dates: string;
}

export function EducationCard({
  logo,
  name,
  nameSubText,
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
        <div css={styles.name}>
          <span>{name}</span>
          {nameSubText && <span css={styles.subText}> {nameSubText}</span>}
        </div>
      </div>
      <time css={styles.dates}>{dates}</time>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    aspectRatio: { default: null, "@container (min-width: 220px)": ratio.tv },
    alignItems: "center",
    containerType: "inline-size",
    display: "grid",
    gap: space._1,
    gridTemplateRows: "1fr auto",
    justifyContent: "flex-start",

    // Override svg css variables to be muted when not hovering
    [svgTokens.fill]: { ":not(:hover)": color.textMuted },
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@container (min-width: 180px)": "64px 1fr",
    },
    alignItems: "center",
    gap: space._2,
    marginBottom: space._1,
  },
  logo: {
    alignItems: "center",
    display: "flex",
    justifyContent: "flex-start",
    maxInlineSize: "64px",
    blockSize: "64px",
    aspectRatio: {
      default: null,
      "@container (min-width: 180px)": ratio.square,
    },
  },
  name: {
    fontSize: font.cqTitle,
    fontWeight: font.weight_7,
    color: color.textMuted,
  },
  subText: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    display: "block",
  },
  img: {
    height: "100%",
    maxInlineSize: "100%",
    objectFit: "contain",
    filter: cardTokens.imageFilter,
    transition: "filter .2s",
  },
  dates: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_4,
    color: color.textMuted,
  },
});
