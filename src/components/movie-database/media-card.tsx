import * as stylex from "@stylexjs/stylex";
import { Card } from "@/components/shared/card";
import { useTranslations } from "@/hooks/use-translations";
import { border, color, font, layer, ratio, space } from "@/tokens.stylex";
import { getLocalePath } from "@/utils/pathname";
import { useTranslationContext } from "@/utils/translation-context";
import type { MediaListItem } from "@/utils/types";
import { PosterImage } from "./poster-image";
import type translations from "./poster-image.translations.json";

interface MediaCardProps {
  media: MediaListItem;
  allowFollow?: boolean;
}

export function MediaCard({ media, allowFollow }: MediaCardProps) {
  const { t } = useTranslations<typeof translations>("posterImage");
  const { locale } = useTranslationContext();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const href = getLocalePath(
    `/movie-database/${media.mediaType}/${media.id.toString()}`,
    locale,
  );

  return (
    <Card
      href={href}
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
            <div css={styles.errorText}>{t("failedToLoadImage")}</div>
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
    fontSize: font.size_00,
    color: color.textMuted,
  },
  rating: {
    position: "absolute",
    top: space._1,
    left: space._1,
    width: space._5,
    height: space._5,
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    borderWidth: ".2em",
    borderColor: color.textMain,
    borderStyle: "solid",
    fontSize: font.size_00,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});
