import * as stylex from "@stylexjs/stylex";
import {
  getMovieVideos,
  getTvShowVideos,
} from "#src/_generated/tmdb-server-functions.ts";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { TrailerButton } from "./trailer-button";

interface TrailerProps {
  mediaType: "movie" | "tv";
  id: string;
  locale: SupportedLocale;
}

export async function Trailer({ mediaType, id, locale }: TrailerProps) {
  const trailers =
    mediaType === "movie"
      ? await getMovieVideos({
          movie_id: id,
          // Hardcode to English as trailers are often only available in English
          language: "en",
        })
      : await getTvShowVideos({
          series_id: id,
          // Hardcode to English as trailers are often only available in English
          language: "en",
        });

  const trailer = trailers.results?.find(
    (video) => video.type === "Trailer" && video.official,
  );
  if (!trailer || !trailer.key) return null;

  const defaultTitle =
    mediaType === "movie"
      ? t({ en: "Movie trailer", zh: "电影预告片" })
      : t({ en: "TV show trailer", zh: "电视剧预告片" });

  return (
    <div css={styles.container}>
      <TrailerButton
        trailerId={trailer.key}
        locale={locale}
        iframeTitle={trailer.name ?? defaultTitle}
      >
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
