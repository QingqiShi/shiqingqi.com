"use client";

import * as stylex from "@stylexjs/stylex";
import { useQueries } from "@tanstack/react-query";
import { useRef } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useScrollFades } from "#src/hooks/use-scroll-fades.ts";
import { t } from "#src/i18n.ts";
import { scrollX } from "#src/primitives/layout.stylex.ts";
import { border, color, font, layer, space } from "#src/tokens.stylex.ts";
import { calculateAge } from "#src/utils/calculate-age.ts";
import { buildSrcSet } from "#src/utils/tmdb-image.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { Skeleton } from "../shared/skeleton";
import { CompactMediaCard } from "./compact-media-card";
import { useMediaDetail, type FocusedPerson } from "./media-detail-context";

const MAX_CREDITS = 20;

export function PersonDetailContent({
  id,
  name: initialName,
  profilePath: initialProfilePath,
}: FocusedPerson) {
  const locale = useLocale();
  const idString = id.toString();

  const [detailQuery, creditsQuery, configQuery] = useQueries({
    queries: [
      tmdbQueries.personDetail({ id: idString, language: locale }),
      tmdbQueries.personCombinedCredits({ id: idString, language: locale }),
      tmdbQueries.configuration,
    ],
  });

  const detail = detailQuery.data;
  const config = configQuery.data;

  const displayName =
    detail?.name || initialName || t({ en: "Unknown", zh: "未知" });
  const profilePath = detail?.profilePath ?? initialProfilePath;
  const imageBaseUrl = config?.images?.secure_base_url;

  // Build filmography from credits
  const filmography = buildFilmography(creditsQuery.data);

  const metaParts = detail
    ? [
        detail.knownForDepartment,
        detail.birthday
          ? `${detail.birthday.split("-")[0]}${detail.deathday ? ` – ${detail.deathday.split("-")[0]}` : ""} (${t({ en: "age", zh: "年龄" })} ${calculateAge(detail.birthday, detail.deathday)})`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  if (detailQuery.isError) {
    return (
      <div css={styles.body}>
        <h2 css={styles.name}>{displayName}</h2>
        <p css={styles.errorText} role="alert">
          {t({ en: "Failed to load details", zh: "加载详情失败" })}
        </p>
      </div>
    );
  }

  return (
    <div css={styles.body}>
      <div css={styles.header}>
        {profilePath && imageBaseUrl ? (
          <div css={styles.photoWrapper}>
            <ProfileImage
              baseUrl={imageBaseUrl}
              sizes={config.images?.profile_sizes ?? []}
              path={profilePath}
              alt={displayName}
            />
          </div>
        ) : profilePath ? (
          <div css={styles.photoWrapper}>
            <Skeleton css={skeletonStyles.photo} />
          </div>
        ) : null}
        <div css={styles.headerInfo}>
          <h2 css={styles.name}>{displayName}</h2>
          {metaParts ? (
            <div css={styles.meta}>{metaParts}</div>
          ) : (
            detailQuery.isPending && <Skeleton width={180} height={14} />
          )}
        </div>
      </div>
      {detail?.biography ? (
        <p css={styles.biography}>{detail.biography}</p>
      ) : (
        detailQuery.isPending && <Skeleton height={48} />
      )}
      {filmography.length > 0 && (
        <div css={styles.filmographySection}>
          <h3 css={styles.filmographyTitle}>
            {t({ en: "Filmography", zh: "作品" })}
          </h3>
          <FilmographyScroller items={filmography} />
        </div>
      )}
    </div>
  );
}

function ProfileImage({
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      css={styles.photo}
      alt={alt}
      src={src}
      srcSet={srcSet}
      sizes="90px"
      decoding="async"
    />
  );
}

interface CreditEntry {
  id: number;
  title: string | undefined;
  posterPath: string | null;
  voteAverage: number;
  mediaType: "movie" | "tv";
  popularity: number;
}

// Combined credits entries have media_type, title (movies), and name (TV)
// at runtime, but the OpenAPI spec flattens the union.
interface CombinedCreditEntry {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string;
  vote_average: number;
  popularity: number;
}

interface CombinedCreditsData {
  cast?: ReadonlyArray<CombinedCreditEntry>;
  crew?: ReadonlyArray<CombinedCreditEntry>;
}

function buildFilmography(
  credits: CombinedCreditsData | undefined,
): ReadonlyArray<MediaListItem> {
  if (!credits) return [];

  const seen = new Set<string>();
  const entries: CreditEntry[] = [];

  function addEntry(entry: CombinedCreditEntry) {
    const mediaType =
      entry.media_type === "movie" || entry.media_type === "tv"
        ? entry.media_type
        : null;
    if (!mediaType) return;
    const key = `${mediaType}:${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({
      id: entry.id,
      title: entry.title ?? entry.name,
      posterPath: entry.poster_path ?? null,
      voteAverage: entry.vote_average,
      mediaType,
      popularity: entry.popularity,
    });
  }

  for (const entry of credits.cast ?? []) addEntry(entry);
  for (const entry of credits.crew ?? []) addEntry(entry);

  entries.sort((a, b) => b.popularity - a.popularity);

  return entries.slice(0, MAX_CREDITS).map<MediaListItem>((entry) => ({
    id: entry.id,
    title: entry.title,
    posterPath: entry.posterPath,
    rating: entry.voteAverage,
    mediaType: entry.mediaType,
  }));
}

function FilmographyScroller({
  items,
}: {
  items: ReadonlyArray<MediaListItem>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftFade, showRightFade } = useScrollFades(scrollRef);
  const { setFocusedPerson, setFocusedMedia } = useMediaDetail();

  return (
    <div css={filmStyles.scrollWrapper}>
      <div
        ref={scrollRef}
        css={[scrollX.base, filmStyles.scrollContainer]}
        role="list"
        aria-label={t({ en: "Filmography", zh: "作品列表" })}
        tabIndex={0}
      >
        {items.map((item) => {
          const { mediaType } = item;
          return (
            <div
              key={`${mediaType}-${item.id}`}
              css={filmStyles.cardWrapper}
              role="listitem"
            >
              <CompactMediaCard
                media={item}
                onClick={
                  mediaType
                    ? () => {
                        setFocusedPerson(null);
                        setFocusedMedia({
                          id: item.id,
                          mediaType,
                          title: item.title,
                          posterPath: item.posterPath,
                        });
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
      <div
        css={[filmStyles.fadeEdge, filmStyles.fadeLeft]}
        style={{ opacity: showLeftFade ? 1 : 0 }}
        aria-hidden="true"
      />
      <div
        css={[filmStyles.fadeEdge, filmStyles.fadeRight]}
        style={{ opacity: showRightFade ? 1 : 0 }}
        aria-hidden="true"
      />
    </div>
  );
}

const styles = stylex.create({
  body: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    padding: space._4,
  },
  header: {
    display: "flex",
    gap: space._3,
    alignItems: "flex-start",
  },
  photoWrapper: {
    flexShrink: 0,
    width: "90px",
    aspectRatio: "1",
    borderRadius: border.radius_round,
    overflow: "hidden",
    zIndex: layer.content,
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    minWidth: 0,
    paddingTop: space._1,
  },
  name: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_7,
    margin: 0,
  },
  meta: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
  biography: {
    fontSize: font.uiBody,
    margin: 0,
    lineHeight: font.lineHeight_4,
    display: "-webkit-box",
    WebkitLineClamp: 6,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  errorText: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
  },
  filmographySection: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  filmographyTitle: {
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    margin: 0,
  },
});

const filmStyles = stylex.create({
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${space._4})`,
    marginRight: `calc(-1 * ${space._4})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    scrollSnapType: "x mandatory",
    paddingLeft: space._4,
    paddingRight: space._4,
    paddingBottom: space._1,
    scrollPaddingLeft: space._4,
    scrollPaddingRight: space._4,
  },
  fadeEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: space._8,
    pointerEvents: "none",
    transition: "opacity 0.2s ease",
  },
  fadeLeft: {
    left: 0,
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundRaisedChannels}, 0), rgba(${color.backgroundRaisedChannels}, 1))`,
  },
  fadeRight: {
    right: 0,
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundRaisedChannels}, 0), rgba(${color.backgroundRaisedChannels}, 1))`,
  },
  cardWrapper: {
    flexShrink: 0,
    scrollSnapAlign: "start",
    width: "80px",
    [breakpoints.sm]: {
      width: "90px",
    },
    [breakpoints.md]: {
      width: "100px",
    },
  },
});

const skeletonStyles = stylex.create({
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
});
