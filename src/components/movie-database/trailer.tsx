import * as stylex from "@stylexjs/stylex";
import { space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { fetchMovieVideos } from "@/utils/tmdb-api";
import { TrailerButton } from "./trailer-button";
import translations from "./translations.json";

interface TrailerProps {
  movieId: string;
  locale: SupportedLocale;
}

export async function Trailer({ movieId, locale }: TrailerProps) {
  const trailers = await fetchMovieVideos(movieId);

  const { t } = getTranslations(translations, locale);

  const trailer = trailers.results?.find(
    (video) => video.type === "Trailer" && video.official
  );
  if (!trailer || !trailer.key) return null;

  return (
    <div css={styles.container}>
      <TrailerButton trailerId={trailer.key} locale={locale}>
        {t("playTrailer")}
      </TrailerButton>
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingTop: space._5,
  },
});
