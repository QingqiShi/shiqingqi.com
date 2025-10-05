import * as stylex from "@stylexjs/stylex";
import { getTvShowVideos } from "@/_generated/tmdb-server-functions";
import { space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { TrailerButton } from "./trailer-button";
import translations from "./translations.json";

interface TvShowTrailerProps {
  tvShowId: string;
  locale: SupportedLocale;
  title: string;
}

export async function TvShowTrailer({
  tvShowId,
  locale,
  title,
}: TvShowTrailerProps) {
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
      <TrailerButton trailerId={trailer.key} locale={locale} title={title}>
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
