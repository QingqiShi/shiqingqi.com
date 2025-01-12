import * as stylex from "@stylexjs/stylex";
import type { paths } from "@/_generated/tmdbV3";
import { Card } from "@/components/shared/card";
import { layer, ratio } from "@/tokens.stylex";
import { getRequestLocale } from "@/utils/request-locale";
import { PosterImage } from "./poster-image";

interface MovieCardProps {
  movie: NonNullable<
    paths["/3/discover/movie"]["get"]["responses"]["200"]["content"]["application/json"]["results"]
  >[number];
}

export async function MovieCard({ movie }: MovieCardProps) {
  const locale = await getRequestLocale();
  return (
    <Card locale={locale} href="/" css={styles.card}>
      {movie.poster_path && movie.title && (
        <div css={styles.posterContainer}>
          <PosterImage posterPath={movie.poster_path} alt={movie.title} />
        </div>
      )}
      {/* TODO: Render ratings */}
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
});
