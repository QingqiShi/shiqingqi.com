"use client";

import * as stylex from "@stylexjs/stylex";
import { Card } from "#src/components/shared/card.tsx";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import {
  border,
  color,
  font,
  layer,
  ratio,
  space,
} from "#src/tokens.stylex.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { PosterImage } from "./poster-image";

interface MediaCardProps {
  media: MediaListItem;
  allowFollow?: boolean;
}

export function MediaCard({ media, allowFollow }: MediaCardProps) {
  const locale = useLocale();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const href = getLocalePath(
    `/movie-database/${media.mediaType}/${media.id.toString()}`,
    locale,
  );

  return (
    <Card
      href={href}
      prefetch={false}
      css={styles.card}
      aria-label={media.title ?? undefined}
      rel={allowFollow ? undefined : "nofollow"}
    >
      <div css={styles.posterContainer}>
        {media.posterPath && media.title ? (
          <PosterImage posterPath={media.posterPath} alt={media.title} />
        ) : (
          <div css={[styles.poster, styles.errored]}>
            <div>{media.title}</div>
            <div css={styles.errorText}>
              {t({ en: "No Poster", zh: "无海报" })}
            </div>
          </div>
        )}
        {media.rating ? (
          <div css={styles.rating}>{formatter.format(media.rating)}</div>
        ) : null}
      </div>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
  posterContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: layer.base,
  },
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  errored: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: color.backgroundRaised,
    zIndex: layer.background,
  },
  errorText: {
    fontSize: font.uiBodySmall,
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
});
