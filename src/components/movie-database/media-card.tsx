"use client";

import * as stylex from "@stylexjs/stylex";
import { Card } from "#src/components/shared/card.tsx";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { absoluteFill } from "#src/primitives/layout.stylex.ts";
import { layer, ratio } from "#src/tokens.stylex.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaPoster } from "./media-poster";

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
      prefetch={false}
      css={styles.card}
      aria-label={getMediaLabel(media)}
      rel={allowFollow ? undefined : "nofollow"}
    >
      <div css={[absoluteFill.all, styles.posterContainer]}>
        <MediaPoster media={media} />
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
