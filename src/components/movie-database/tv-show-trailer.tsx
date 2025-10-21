import { getTvShowVideos } from "@/_generated/tmdb-server-functions";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
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
    <div className="pt-5">
      <TrailerButton trailerId={trailer.key} locale={locale}>
        {t("playTrailer")}
      </TrailerButton>
    </div>
  );
}
