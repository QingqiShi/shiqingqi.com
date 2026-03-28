"use client";

import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import * as stylex from "@stylexjs/stylex";
import { useQueries } from "@tanstack/react-query";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { imageCover } from "#src/primitives/layout.stylex.ts";
import {
  border,
  color,
  font,
  layer,
  ratio,
  shadow,
  space,
} from "#src/tokens.stylex.ts";
import { buildSrcSet } from "#src/utils/tmdb-image.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { Button } from "../shared/button";
import { Skeleton } from "../shared/skeleton";
import { useChatActions } from "./chat-actions-context";
import { useMediaDetail, type FocusedMedia } from "./media-detail-context";

function formatMovieRuntime(minutes: number) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours > 0 ? `${hours}${t({ en: "h", zh: " 小时" })} ` : ""}${mins}${t({ en: "m", zh: " 分钟" })}`;
}

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
      tmdbQueries.mediaDetail({
        type: mediaType,
        id: idString,
        language: locale,
      }),
      // Always fetch in English — Chinese trailer results are too sparse
      tmdbQueries.mediaVideos({
        type: mediaType,
        id: idString,
        language: "en",
      }),
      tmdbQueries.configuration,
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
            ? `${detail.numberOfSeasons} ${
                new Intl.PluralRules(locale ?? "en").select(
                  detail.numberOfSeasons,
                ) === "one"
                  ? t({ en: "season", zh: "季" })
                  : t({ en: "seasons", zh: "季" })
              }`
            : ""
          : formatMovieRuntime(detail.runtime),
        detail.genres.join(t({ en: ", ", zh: "、" })),
      ]
        .filter(Boolean)
        .join(" • ")
    : null;

  const overview = detail ? detail.overview || detail.tagline : null;

  const trailer = videos?.results?.find(
    (video) => video.type === "Trailer" && video.official,
  );

  if (detailQuery.isError) {
    return (
      <div css={styles.body}>
        <h2 css={styles.title}>{displayTitle}</h2>
        <p css={styles.errorText} role="alert">
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
          alt={displayTitle}
        />
      ) : (
        detailQuery.isPending && <Skeleton css={skeletonStyles.backdrop} />
      )}
      <div css={styles.body}>
        <div css={styles.header}>
          {posterPath && imageBaseUrl ? (
            <div css={styles.posterWrapper}>
              <PosterImage
                baseUrl={imageBaseUrl}
                sizes={config.images?.poster_sizes ?? []}
                path={posterPath}
                alt={displayTitle}
              />
            </div>
          ) : posterPath ? (
            <div css={styles.posterWrapper}>
              <Skeleton css={skeletonStyles.poster} />
            </div>
          ) : null}
          <div css={styles.headerInfo}>
            {detail ? (
              <div css={styles.ratingRow}>
                <span css={styles.rating}>
                  {formatter.format(detail.voteAverage)}
                </span>
                <span css={styles.voteCount}>
                  ({formatter.format(detail.voteCount)})
                </span>
              </div>
            ) : (
              <Skeleton width={60} height={20} />
            )}
            <h2 css={styles.title}>{displayTitle}</h2>
            {metaParts ? (
              <div css={styles.meta}>{metaParts}</div>
            ) : (
              detailQuery.isPending && <Skeleton width={180} height={14} />
            )}
          </div>
        </div>
        {overview ? (
          <p css={styles.description}>{overview}</p>
        ) : (
          detailQuery.isPending && <Skeleton height={48} />
        )}
        <div css={styles.actions}>
          {trailer?.key && (
            <a
              href={`https://www.youtube.com/watch?v=${trailer.key}`}
              css={styles.trailerLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                locale === "zh"
                  ? `观看${displayTitle}的预告`
                  : `Watch trailer for ${displayTitle}`
              }
            >
              <PlayIcon weight="fill" size={14} />
              {t({ en: "Trailer", zh: "预告" })}
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
      isActive
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
  alt,
}: {
  baseUrl: string;
  sizes: ReadonlyArray<string>;
  path: string;
  alt: string;
}) {
  const { src, srcSet } = buildSrcSet(baseUrl, sizes, path);
  return (
    // TMDB images are already optimized by the provider — no need for next/image
    // eslint-disable-next-line @next/next/no-img-element
    <img
      css={imageCover.base}
      alt={alt}
      src={src}
      srcSet={srcSet}
      sizes="90px"
      loading="lazy"
    />
  );
}

function BackdropImage({
  baseUrl,
  sizes,
  path,
  alt,
}: {
  baseUrl: string;
  sizes: ReadonlyArray<string>;
  path: string;
  alt: string;
}) {
  const { src, srcSet } = buildSrcSet(baseUrl, sizes, path);
  return (
    <div css={styles.backdropContainer}>
      {/* TMDB images are already optimized by the provider — no need for next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        css={styles.backdropImage}
        alt={alt}
        src={src}
        srcSet={srcSet}
        sizes="600px"
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
    backgroundImage: `linear-gradient(to bottom, transparent, ${color.backgroundRaised})`,
  },
  body: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    padding: space._4,
    marginTop: `calc(-1 * ${space._10})`,
  },
  header: {
    display: "flex",
    gap: space._3,
    alignItems: "flex-end",
  },
  posterWrapper: {
    flexShrink: 0,
    width: "90px",
    aspectRatio: ratio.poster,
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: shadow._2,
    zIndex: layer.content,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    minWidth: 0,
    paddingBottom: space._1,
  },
  ratingRow: {
    display: "flex",
    alignItems: "baseline",
    gap: space._1,
  },
  rating: {
    fontSize: font.uiHeading2,
    fontWeight: font.weight_8,
  },
  voteCount: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  title: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_7,
    margin: 0,
  },
  meta: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
  description: {
    fontSize: font.uiBody,
    margin: 0,
    lineHeight: font.lineHeight_4,
  },
  errorText: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._2,
    paddingTop: space._2,
  },
  trailerLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: {
      default: color.textMuted,
      ":hover": color.textOnActive,
      ":focus-visible": color.textOnActive,
    },
    textDecoration: "none",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: {
      default: color.controlTrack,
      ":hover": color.controlActive,
      ":focus-visible": color.controlActive,
    },
    backgroundColor: {
      default: "transparent",
      ":hover": color.controlActive,
      ":focus-visible": color.controlActive,
    },
    borderRadius: border.radius_round,
    paddingBlock: space._1,
    paddingInline: space._3,
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
});

const skeletonStyles = stylex.create({
  backdrop: {
    width: "100%",
    aspectRatio: ratio.wide,
    borderRadius: 0,
  },
  poster: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
});
