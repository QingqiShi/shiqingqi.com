import * as stylex from "@stylexjs/stylex";
import { getMovieVideos } from "#src/_generated/tmdb-server-functions.ts";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { TrailerButton } from "./trailer-button";

interface TrailerProps {
  movieId: string;
  locale: SupportedLocale;
}

export async function Trailer({ movieId, locale }: TrailerProps) {
  const trailers = await getMovieVideos({
    movie_id: movieId,
    // Hardcode to English as trailers are often only available in English
    language: "en",
  });

  const trailer = trailers.results?.find(
    (video) => video.type === "Trailer" && video.official,
  );
  if (!trailer || !trailer.key) return null;

  return (
    <div css={styles.container}>
      <TrailerButton trailerId={trailer.key} locale={locale}>
        {t({ en: "Play trailer", zh: "播放预告" })}
      </TrailerButton>
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingTop: space._5,
  },
});
