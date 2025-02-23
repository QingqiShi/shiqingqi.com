import * as stylex from "@stylexjs/stylex";
import { Card } from "@/components/shared/card";
import { useTranslations } from "@/hooks/use-translations";
import { border, color, font, layer, ratio, space } from "@/tokens.stylex";
import type { MovieListItem } from "@/utils/tmdb-api";
import { useTranslationContext } from "@/utils/translation-context";
import { PosterImage } from "./poster-image";
import type translations from "./poster-image.translations.json";

interface MovieCardProps {
  movie: MovieListItem;
}

export function MovieCard({ movie }: MovieCardProps) {
  const { t } = useTranslations<typeof translations>("posterImage");
  const { locale } = useTranslationContext();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <Card
      href="/"
      css={styles.card}
      aria-label={movie.title}
      onClick={(e) => e.preventDefault()}
    >
      <div css={styles.posterContainer}>
        {movie.posterPath && movie.title ? (
          <PosterImage posterPath={movie.posterPath} alt={movie.title} />
        ) : (
          <div css={[styles.poster, styles.errored]}>
            <div>{movie.title}</div>
            <div css={styles.errorText}>{t("failedToLoadImage")}</div>
          </div>
        )}
        {movie.rating ? (
          <div css={styles.rating}>{formatter.format(movie.rating)}</div>
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
    background: color.backgroundRaised,
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
