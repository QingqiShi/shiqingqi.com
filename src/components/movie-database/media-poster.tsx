"use client";

import * as stylex from "@stylexjs/stylex";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { PosterImage } from "./poster-image";

interface MediaPosterProps {
  media: MediaListItem;
  compact?: boolean;
}

export function MediaPoster({ media, compact }: MediaPosterProps) {
  const locale = useLocale();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <>
      {media.posterPath && media.title ? (
        <PosterImage posterPath={media.posterPath} alt={media.title} />
      ) : (
        <div css={[styles.noPoster, compact && styles.noPosterCompact]}>
          <div>{media.title}</div>
          <div css={styles.noPosterLabel}>
            {t({ en: "No Poster", zh: "无海报" })}
          </div>
        </div>
      )}
      {media.rating ? (
        <div
          css={[styles.rating, compact && styles.ratingCompact]}
          aria-label={`${t({ en: "User rating", zh: "用户评分" })}: ${formatter.format(media.rating)}`}
        >
          {formatter.format(media.rating)}
        </div>
      ) : null}
    </>
  );
}

const styles = stylex.create({
  noPoster: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: color.backgroundRaised,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_2,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  noPosterCompact: {
    fontSize: font.uiBodySmall,
  },
  noPosterLabel: {
    fontSize: "0.7rem",
    color: color.textMuted,
  },
  rating: {
    position: "absolute",
    top: space._1,
    left: space._1,
    width: space._7,
    height: space._7,
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    borderWidth: ".2em",
    borderColor: color.textMain,
    borderStyle: "solid",
    fontSize: font.uiBodySmall,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingCompact: {
    top: space._0,
    left: space._0,
    width: "1.4rem",
    height: "1.4rem",
    borderWidth: "1.5px",
    fontSize: "0.6rem",
    fontWeight: font.weight_6,
  },
});
