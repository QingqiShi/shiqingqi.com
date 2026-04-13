import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { skeletonTokens } from "#src/components/shared/skeleton.stylex.ts";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { t } from "#src/i18n.ts";
import {
  border,
  color,
  controlSize,
  font,
  layout,
  space,
} from "#src/tokens.stylex.ts";
import { BackdropImage } from "./backdrop-image.tsx";

interface MediaDetailHeroProps {
  title: string;
  backdropPath: string | null | undefined;
  voteAverage: number;
  voteCount: number;
  meta: string;
  description: string | null | undefined;
  locale: string;
  trailer: ReactNode;
}

export function MediaDetailHero({
  title,
  backdropPath,
  voteAverage,
  voteCount,
  meta,
  description,
  locale,
  trailer,
}: MediaDetailHeroProps) {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <div css={styles.container}>
      {backdropPath && (
        <BackdropImage backdropPath={backdropPath} alt={title} />
      )}
      <div css={styles.hero}>
        <div
          css={styles.ratingContainer}
          role="img"
          aria-label={`${t({ en: "User rating", zh: "用户评分" })}: ${formatter.format(voteAverage)}${t({ en: " out of 10", zh: "/10" })}, ${t({ en: "based on", zh: "基于" })} ${voteCount.toLocaleString(locale)} ${t({ en: "votes", zh: "票" })}`}
        >
          <div css={styles.rating} aria-hidden="true">
            {formatter.format(voteAverage)}
          </div>
          <div css={styles.count} aria-hidden="true">
            {formatter.format(voteCount)}
          </div>
        </div>
        <h1 css={styles.h1}>{title}</h1>
        <div css={styles.meta}>{meta}</div>
        {description && <p css={styles.description}>{description}</p>}
        <Suspense
          fallback={<Skeleton css={styles.trailerButtonSkeleton} width={120} />}
        >
          {trailer}
        </Suspense>
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    marginBottom: space._10,
    paddingBlock: 0,
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  hero: {
    paddingTop: {
      default: space._12,
      [breakpoints.md]: `clamp(${space._10}, 20dvw, 30dvh)`,
      [breakpoints.xl]: `min(${space._13}, 30dvh)`,
    },
    paddingInline: space._3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: space._3,
  },
  h1: {
    fontSize: font.vpHeading1,
    margin: 0,
  },
  meta: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
  description: {
    fontSize: font.uiBody,
    margin: 0,
  },
  ratingContainer: {
    width: space._10,
    height: space._10,
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    borderWidth: space._0,
    borderColor: color.textMuted,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  rating: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
  },
  count: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  trailerButtonSkeleton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
