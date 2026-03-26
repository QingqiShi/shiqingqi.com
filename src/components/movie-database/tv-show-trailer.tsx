import * as stylex from "@stylexjs/stylex";
import { getTvShowVideos } from "#src/_generated/tmdb-server-functions.ts";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { TrailerButton } from "./trailer-button";

interface TvShowTrailerProps {
  tvShowId: string;
  locale: SupportedLocale;
}

export async function TvShowTrailer({ tvShowId, locale }: TvShowTrailerProps) {
  const trailers = await getTvShowVideos({
    series_id: tvShowId,
    language: locale,
  });

  const trailer = trailers.results?.find(
    (video) => video.type === "Trailer" && video.official,
  );
  if (!trailer || !trailer.key) return null;

  return (
    <div css={styles.container}>
      <TrailerButton
        trailerId={trailer.key}
        locale={locale}
        iframeTitle={
          trailer.name ?? t({ en: "TV show trailer", zh: "电视剧预告片" })
        }
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
