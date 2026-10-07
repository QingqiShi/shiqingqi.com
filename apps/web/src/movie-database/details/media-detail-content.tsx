"use client";

import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import * as stylex from "@stylexjs/stylex";
import { useQueries } from "@tanstack/react-query";
import { Button } from "@tuja/ui/components/button";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { imageCover } from "@tuja/ui/primitives/layout.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  layer,
  ratio,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { ExternalLinkIndicator } from "#src/links/external-link-indicator.tsx";
import { useChatActions } from "#src/movie-database/chat/chat-actions-context.tsx";
import { configurationQuery } from "#src/movie-database/tmdb/queries/configuration-query.ts";
import { mediaDetailsQuery } from "#src/movie-database/tmdb/queries/media-details-query.ts";
import { mediaVideosQuery } from "#src/movie-database/tmdb/queries/media-videos-query.ts";
import { TmdbImage } from "#src/movie-database/tmdb/tmdb-image.tsx";
import { formatRuntime } from "./format-runtime.ts";
import { useMediaDetail, type FocusedMedia } from "./media-detail-provider";

export function MediaDetailContent({
  id,
  mediaType,
  title: initialTitle,
  posterPath: initialPosterPath,
}: FocusedMedia) {
  const locale = useLocale();
  const idString = id.toString();

  const [detailQuery, videosQuery, configQuery] = useQueries({
    queries: [
      mediaDetailsQuery({
        type: mediaType,
        id: idString,
        language: locale,
      }),
      // Always fetch in English — Chinese trailer results are too sparse
      mediaVideosQuery({
        type: mediaType,
        id: idString,
        language: "en",
      }),
      configurationQuery(),
    ],
  });

  const detail = detailQuery.data;
  const videos = videosQuery.data;
  const config = configQuery.data;

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });

  const displayTitle =
    detail?.title || initialTitle || t({ en: "Untitled", zh: "未命名" });
  const posterPath = detail?.posterPath ?? initialPosterPath;
  const imageBaseUrl = config?.images?.secure_base_url;

  const metaParts = detail
    ? [
        detail.releaseDate?.split("-")[0],
        mediaType === "tv"
          ? detail.numberOfSeasons
            ? `${String(detail.numberOfSeasons)} ${
                new Intl.PluralRules(locale).select(detail.numberOfSeasons) ===
                "one"
                  ? t({ en: "season", zh: "季" })
                  : t({ en: "seasons", zh: "季" })
              }`
            : ""
          : formatRuntime(detail.runtime, locale),
        detail.genres.join(t({ en: ", ", zh: "、" })),
      ]
        .filter(Boolean)
        .join(" • ")
    : null;

  const overview = detail ? detail.overview || detail.tagline : null;

  // The trailer link points at youtube.com/watch, so skip videos on other
  // sites (e.g. Vimeo) rather than building a broken YouTube URL.
  const trailer = videos?.results?.find(
    (video) =>
      video.type === "Trailer" && video.official && video.site === "YouTube",
  );

  const hasBackdrop = Boolean(detail?.backdropPath && imageBaseUrl);

  if (detailQuery.isError) {
    return (
      <div css={styles.body}>
        <h2 css={[typeRole.h1, styles.title]}>{displayTitle}</h2>
        <p css={[typeRole.bodySmall, styles.errorText]} role="alert">
          {t({
            en: "Failed to load details",
            zh: "加载详情失败",
          })}
        </p>
        <div css={styles.actions}>
          <AddToChatButton id={id} mediaType={mediaType} title={displayTitle} />
        </div>
      </div>
    );
  }

  return (
    <>
      {detail?.backdropPath && imageBaseUrl ? (
        <BackdropImage
          baseUrl={imageBaseUrl}
          sizes={config.images?.backdrop_sizes ?? []}
          path={detail.backdropPath}
        />
      ) : (
        detailQuery.isPending && <Skeleton css={skeletonStyles.backdrop} />
      )}
      <div css={[styles.body, hasBackdrop && styles.bodyWithBackdrop]}>
        <div css={[row.item, styles.header]}>
          {posterPath && imageBaseUrl ? (
            <div css={[corner.radius_2, styles.posterWrapper]}>
              <PosterImage
                baseUrl={imageBaseUrl}
                sizes={config.images?.poster_sizes ?? []}
                path={posterPath}
                fallbackInitial={displayTitle.charAt(0)}
              />
            </div>
          ) : posterPath ? (
            <div css={[corner.radius_2, styles.posterWrapper]}>
              <Skeleton css={skeletonStyles.poster} />
            </div>
          ) : null}
          <div css={styles.headerInfo}>
            {detail ? (
              // TMDB returns voteAverage=0 + voteCount=0 for titles nobody
              // has rated yet — that's "not yet rated", not an actual zero.
              // Drop the row entirely in that case (matches the MediaPoster
              // precedent) rather than render a misleading "0 (0)".
              detail.voteCount > 0 && (
                <div
                  css={[row.tight, styles.ratingRow]}
                  role="img"
                  aria-label={`${t({ en: "User rating", zh: "用户评分" })}: ${formatter.format(detail.voteAverage)}${t({ en: " out of 10", zh: "/10" })}, ${formatter.format(detail.voteCount)} ${t({ en: "votes", zh: "票" })}`}
                >
                  <span css={typeRole.h2} aria-hidden="true">
                    {formatter.format(detail.voteAverage)}
                  </span>
                  <span
                    css={[typeRole.bodySmall, styles.voteCount]}
                    aria-hidden="true"
                  >
                    ({formatter.format(detail.voteCount)})
                  </span>
                </div>
              )
            ) : (
              <Skeleton width={60} height={20} />
            )}
            <h2 css={[typeRole.h1, styles.title]}>{displayTitle}</h2>
            {metaParts ? (
              <div css={[typeRole.bodySmall, styles.meta]}>{metaParts}</div>
            ) : (
              detailQuery.isPending && <Skeleton width={180} height={14} />
            )}
          </div>
        </div>
        {overview ? (
          <p css={[typeRole.body, styles.description]}>{overview}</p>
        ) : (
          detailQuery.isPending && <Skeleton height={48} />
        )}
        <div css={styles.actions}>
          {trailer?.key && (
            <a
              href={`https://www.youtube.com/watch?v=${trailer.key}`}
              css={[typeRole.label, corner.radius_round, styles.trailerLink]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                locale === "zh"
                  ? `观看${displayTitle}的预告 (在新标签页中打开)`
                  : `Watch trailer for ${displayTitle} (opens in new tab)`
              }
            >
              <PlayIcon weight="fill" size={14} aria-hidden="true" />
              {t({ en: "Trailer", zh: "预告" })}
              <ExternalLinkIndicator />
            </a>
          )}
          <AddToChatButton id={id} mediaType={mediaType} title={displayTitle} />
        </div>
      </div>
    </>
  );
}

interface AddToChatButtonProps {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
}

function AddToChatButton({ id, mediaType, title }: AddToChatButtonProps) {
  const { setAttachedMedia } = useChatActions();
  const { setFocusedMedia } = useMediaDetail();

  function handleClick() {
    setAttachedMedia({ id, mediaType, title });
    setFocusedMedia(null);
  }

  return (
    <Button
      icon={<ChatTextIcon weight="fill" role="presentation" />}
      look="primary"
      onClick={handleClick}
    >
      {t({ en: "Add to chat", zh: "添加到聊天" })}
    </Button>
  );
}

function PosterImage({
  baseUrl,
  sizes,
  path,
  fallbackInitial,
}: {
  baseUrl: string;
  sizes: ReadonlyArray<string>;
  path: string;
  fallbackInitial: string;
}) {
  // The surrounding overlay renders the media title in an adjacent <h2>,
  // so the poster is decorative (WAI-ARIA 1.2 decorative-image pattern).
  return (
    <TmdbImage
      baseUrl={baseUrl}
      sizeConfig={sizes}
      path={path}
      alt=""
      sizes="90px"
      imgCss={imageCover.base}
      skeletonCss={skeletonStyles.poster}
      errorFallback={
        <div css={[typeRole.h1, imageCover.base, styles.imageFallback]}>
          {fallbackInitial}
        </div>
      }
    />
  );
}

function BackdropImage({
  baseUrl,
  sizes,
  path,
}: {
  baseUrl: string;
  sizes: ReadonlyArray<string>;
  path: string;
}) {
  // The surrounding overlay renders the media title in an adjacent <h2>,
  // so the backdrop is decorative (WAI-ARIA 1.2 decorative-image pattern).
  return (
    <div css={styles.backdropContainer}>
      <TmdbImage
        baseUrl={baseUrl}
        sizeConfig={sizes}
        path={path}
        alt=""
        sizes="600px"
        imgCss={styles.backdropImage}
        skeletonCss={skeletonStyles.backdropOverlay}
      />
      <div role="presentation" css={styles.backdropGradient} />
    </div>
  );
}

const styles = stylex.create({
  backdropContainer: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
  },
  backdropImage: {
    width: "100%",
    aspectRatio: ratio.wide,
    objectFit: "cover",
    objectPosition: "center center",
    display: "block",
  },
  backdropGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "50%",
    zIndex: layer.base,
    backgroundImage: `linear-gradient(to bottom, transparent, ${color.bgSurface})`,
  },
  body: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    padding: space._4,
  },
  bodyWithBackdrop: {
    marginTop: `calc(-1 * ${space._10})`,
  },
  header: {
    alignItems: "flex-end",
  },
  posterWrapper: {
    position: "relative",
    flexShrink: 0,
    width: "90px",
    aspectRatio: ratio.poster,
    overflow: "hidden",
    boxShadow: shadow._2,
    zIndex: layer.content,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    minWidth: 0,
    paddingBottom: space._1,
  },
  ratingRow: {
    alignItems: "baseline",
  },
  voteCount: {
    color: color.fgMuted,
  },
  title: {
    margin: 0,
  },
  meta: {
    color: color.fgMuted,
    margin: 0,
  },
  description: {
    margin: 0,
  },
  errorText: {
    margin: 0,
    color: color.fgMuted,
    fontStyle: "italic",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.tight,
    paddingTop: space._2,
  },
  trailerLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    color: {
      default: color.fgMuted,
      ":hover": color.fgOnAccent,
      ":focus-visible": color.fgOnAccent,
    },
    textDecoration: "none",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: {
      default: color.border,
      ":hover": color.borderAccent,
      ":focus-visible": color.borderAccent,
    },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgAccent,
      ":focus-visible": color.bgAccent,
    },
    paddingBlock: space._1,
    paddingInline: space._3,
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  imageFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.bgSurface,
    color: color.fgMuted,
  },
});

const skeletonStyles = stylex.create({
  backdrop: {
    width: "100%",
    aspectRatio: ratio.wide,
    borderRadius: 0,
  },
  backdropOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 0,
  },
  poster: {
    position: "absolute",
    inset: 0,
    borderRadius: 0,
  },
});
