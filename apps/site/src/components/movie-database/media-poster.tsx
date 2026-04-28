"use client";

import * as stylex from "@stylexjs/stylex";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { PosterImage } from "./poster-image";

interface MediaPosterProps {
  media: MediaListItem;
  compact?: boolean;
  // When the poster is rendered inside a container that already carries the
  // media title as its accessible name (e.g. `MediaCard`'s `aria-label`),
  // set `decorative` so the `<img>` gets `alt=""` and screen readers stop
  // announcing the title twice. The visible fallback still shows the title.
  decorative?: boolean;
}

function getPosterAlt(media: MediaListItem): string {
  if (media.title) return media.title;
  if (media.mediaType === "movie")
    return t({ en: "Movie poster", zh: "电影海报" });
  if (media.mediaType === "tv")
    return t({ en: "TV show poster", zh: "电视剧海报" });
  return t({ en: "Media poster", zh: "媒体海报" });
}

export function MediaPoster({ media, compact, decorative }: MediaPosterProps) {
  const locale = useLocale();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const alt = decorative ? "" : getPosterAlt(media);
  const fallbackLabel = getPosterAlt(media);

  return (
    <>
      {media.posterPath ? (
        <PosterImage
          posterPath={media.posterPath}
          alt={alt}
          fallbackLabel={fallbackLabel}
        />
      ) : (
        <div
          css={[
            flex.center,
            styles.noPoster,
            compact && styles.noPosterCompact,
          ]}
        >
          <div>{media.title}</div>
          <div css={styles.noPosterLabel}>
            {t({ en: "No Poster", zh: "无海报" })}
          </div>
        </div>
      )}
      {media.rating ? (
        <div
          css={[flex.center, styles.rating, compact && styles.ratingCompact]}
          role="img"
          aria-label={`${t({ en: "User rating", zh: "用户评分" })}: ${formatter.format(media.rating)}`}
        >
          <span aria-hidden="true">{formatter.format(media.rating)}</span>
        </div>
      ) : null}
    </>
  );
}

const styles = stylex.create({
  noPoster: {
    width: "100%",
    height: "100%",
    flexDirection: "column",
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
