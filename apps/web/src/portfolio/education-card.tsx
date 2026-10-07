import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, ratio, rhythm } from "@tuja/ui/tokens.stylex";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Suspense } from "react";
import { svgTokens } from "#src/brand/svg.stylex.ts";
import { cardTokens } from "#src/links/card.stylex.ts";
import { Card } from "#src/links/card.tsx";

interface EducationCardProps extends React.ComponentProps<typeof Card> {
  logo: React.ReactNode | { src: StaticImageData; alt: string };
  name: string;
  nameSubText?: string;
  dates: string;
  /** ISO start date for the `<time dateTime>` attribute (e.g. "2016-09"). */
  dateTime: string;
}

export function EducationCard({
  logo,
  name,
  nameSubText,
  dates,
  dateTime,
  css,
  ...rest
}: EducationCardProps) {
  return (
    <Card {...rest} css={[styles.card, css]}>
      <div css={styles.row}>
        <div css={[flex.row, styles.logo]}>
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
        <div css={[typeRole.cardTitle, styles.name]}>
          <span>{name}</span>
          {nameSubText && (
            <span css={[typeRole.label, styles.subText]}> {nameSubText}</span>
          )}
        </div>
      </div>
      <time dateTime={dateTime} css={[typeRole.bodySmall, styles.dates]}>
        {dates}
      </time>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    aspectRatio: { default: null, "@container (min-width: 220px)": ratio.tv },
    alignItems: "center",
    containerType: "inline-size",
    display: "grid",
    gap: rhythm.tight,
    gridTemplateRows: "1fr auto",
    justifyContent: "flex-start",

    // Override svg css variables to be muted when not hovering
    [svgTokens.fill]: { ":not(:hover)": color.fgMuted },
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@container (min-width: 180px)": "64px 1fr",
    },
    alignItems: "center",
    gap: rhythm.tight,
  },
  logo: {
    maxInlineSize: "64px",
    blockSize: "64px",
    aspectRatio: {
      default: null,
      "@container (min-width: 180px)": ratio.square,
    },
  },
  name: {
    color: color.fgMuted,
  },
  subText: {
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
    color: color.fgMuted,
  },
});
