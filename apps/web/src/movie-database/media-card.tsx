"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { absoluteFill } from "@tuja/ui/primitives/layout.stylex";
import { layer, ratio } from "@tuja/ui/tokens.stylex";
import { Card } from "#src/links/card.tsx";
import { MediaPoster } from "./media-poster";
import type { MediaListItem } from "./types.ts";

interface MediaCardProps {
  media: MediaListItem;
  allowFollow?: boolean;
}

function getMediaLabel(media: MediaListItem): string {
  if (media.title) return media.title;
  if (media.mediaType === "movie") return t({ en: "Movie", zh: "电影" });
  if (media.mediaType === "tv") return t({ en: "TV show", zh: "电视剧" });
  return t({ en: "Media", zh: "媒体" });
}

export function MediaCard({ media, allowFollow }: MediaCardProps) {
  const locale = useLocale();

  const href = getLocalePath(
    `/movie-database/${String(media.mediaType)}/${media.id.toString()}`,
    locale,
  );

  return (
    <Card
      href={href}
      css={styles.card}
      aria-label={getMediaLabel(media)}
      rel={allowFollow ? undefined : "nofollow"}
    >
      <div css={[absoluteFill.all, styles.posterContainer]}>
        <MediaPoster media={media} decorative />
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
    zIndex: layer.base,
  },
});
