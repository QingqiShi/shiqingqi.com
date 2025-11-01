import * as stylex from "@stylexjs/stylex";
import { getTvShowVideos } from "#src/_generated/tmdb-server-functions.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { TrailerButton } from "./trailer-button";
import translations from "./translations.json";

interface TvShowTrailerProps {
  tvShowId: string;
  locale: SupportedLocale;
}

export async function TvShowTrailer({ tvShowId, locale }: TvShowTrailerProps) {
  const trailers = await getTvShowVideos({
    series_id: tvShowId,
    language: locale,
  });

  const { t } = getTranslations(translations, locale);

  const trailer = trailers.results?.find(
    (video) => video.type === "Trailer" && video.official,
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
