"use client";

import * as stylex from "@stylexjs/stylex";
import { useQueries } from "@tanstack/react-query";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, layer, measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { CompactMediaCard } from "#src/movie-database/compact-media-card.tsx";
import { DepartmentLabel } from "#src/movie-database/department-label.ts";
import { HorizontalScrollRow } from "#src/movie-database/horizontal-scroll-row.tsx";
import { configurationQuery } from "#src/movie-database/tmdb/queries/configuration-query.ts";
import { personCombinedCreditsQuery } from "#src/movie-database/tmdb/queries/person-combined-credits-query.ts";
import { personDetailsQuery } from "#src/movie-database/tmdb/queries/person-details-query.ts";
import { TmdbImage } from "#src/movie-database/tmdb/tmdb-image.tsx";
import type { MediaListItem } from "#src/movie-database/types.ts";
import { calculateAge } from "./calculate-age";
import { useMediaDetail, type FocusedPerson } from "./media-detail-provider";

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
      personDetailsQuery({ id: idString, language: locale }),
      personCombinedCreditsQuery({ id: idString, language: locale }),
      configurationQuery(),
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

  const lifespan = detail?.birthday
    ? `${detail.birthday.split("-")[0]}${detail.deathday ? ` – ${detail.deathday.split("-")[0]}` : ""} (${t({ en: "age", zh: "年龄" })} ${String(calculateAge(detail.birthday, detail.deathday))})`
    : null;
  const hasDepartment = Boolean(detail?.knownForDepartment);
  const hasMeta = detail && (hasDepartment || lifespan);

  if (detailQuery.isError) {
    return (
      <div css={styles.body}>
        <h2 css={[typeRole.h1, styles.name]}>{displayName}</h2>
        <p css={[typeRole.bodySmall, styles.errorText]} role="alert">
          {t({ en: "Failed to load details", zh: "加载详情失败" })}
        </p>
      </div>
    );
  }

  return (
    <div css={styles.body}>
      <div css={[row.item, styles.header]}>
        {profilePath && imageBaseUrl ? (
          <div css={[corner.radius_round, styles.photoWrapper]}>
            <ProfileImage
              baseUrl={imageBaseUrl}
              sizes={config.images?.profile_sizes ?? []}
              path={profilePath}
              alt={displayName}
            />
          </div>
        ) : profilePath ? (
          <div css={[corner.radius_round, styles.photoWrapper]}>
            <Skeleton css={skeletonStyles.photo} />
          </div>
        ) : null}
        <div css={styles.headerInfo}>
          <h2 css={[typeRole.h1, styles.name]}>{displayName}</h2>
          {hasMeta ? (
            <div css={[typeRole.bodySmall, styles.meta]}>
              {detail.knownForDepartment && (
                <DepartmentLabel department={detail.knownForDepartment} />
              )}
              {detail.knownForDepartment && lifespan ? " · " : null}
              {lifespan}
            </div>
          ) : (
            detailQuery.isPending && <Skeleton width={180} height={14} />
          )}
        </div>
      </div>
      {detail?.biography ? (
        <ExpandableBiography text={detail.biography} />
      ) : (
        detailQuery.isPending && <Skeleton height={48} />
      )}
      {filmography.length > 0 && (
        <div css={stack.tight}>
          <h3 css={[typeRole.h4, styles.filmographyTitle]}>
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
  return (
    <TmdbImage
      baseUrl={baseUrl}
      sizeConfig={sizes}
      path={path}
      alt={alt}
      sizes="90px"
      imgCss={styles.photo}
      skeletonCss={skeletonStyles.photo}
      errorFallback={
        <div css={[typeRole.h1, styles.profileFallback]}>{alt.charAt(0)}</div>
      }
    />
  );
}

const LINE_CLAMP = 6;

export function ExpandableBiography({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const biographyId = useId();

  // Observe layout changes on the paragraph itself. `measure` reads live
  // DOM (scrollHeight vs clientHeight) rather than closing over `expanded`,
  // so the observer never needs to be torn down and rebuilt on toggle —
  // the natural ResizeObserver fire from the clamp class flipping already
  // delivers the measurement. Empty deps: set up once per mount.
  useEffect(() => {
    const el = paragraphRef.current;
    if (!el) return;

    const measure = () => {
      setIsClamped(el.scrollHeight > el.clientHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      <p
        id={biographyId}
        ref={paragraphRef}
        css={[
          typeRole.body,
          styles.biography,
          !expanded && styles.biographyClamped,
        ]}
      >
        {text}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          css={[typeRole.bodySmall, buttonReset.base, styles.readMoreButton]}
          aria-expanded={expanded}
          aria-controls={biographyId}
          onClick={() => {
            setExpanded((prev) => !prev);
          }}
        >
          {expanded
            ? t({ en: "Read less", zh: "收起" })
            : t({ en: "Read more", zh: "展开" })}
        </button>
      )}
    </div>
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
    const key = `${mediaType}:${String(entry.id)}`;
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
  const { setFocusedMedia } = useMediaDetail();

  return (
    <HorizontalScrollRow
      ariaLabel={t({ en: "Filmography", zh: "作品列表" })}
      css={filmStyles.root}
      contentCss={filmStyles.scrollContainer}
    >
      {items.map((item) => {
        const { mediaType } = item;
        return (
          <div
            key={`${String(mediaType)}-${String(item.id)}`}
            css={filmStyles.cardWrapper}
            role="listitem"
          >
            <CompactMediaCard
              media={item}
              onClick={
                mediaType
                  ? () => {
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
    </HorizontalScrollRow>
  );
}

const styles = stylex.create({
  body: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    padding: space._4,
  },
  header: {
    alignItems: "flex-start",
  },
  photoWrapper: {
    position: "relative",
    flexShrink: 0,
    width: "90px",
    aspectRatio: "1",
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
    gap: rhythm.tight,
    minWidth: 0,
    paddingTop: space._1,
  },
  name: {
    margin: 0,
  },
  meta: {
    color: color.fgMuted,
    margin: 0,
  },
  biography: {
    margin: 0,
    maxInlineSize: measure.prose,
  },
  biographyClamped: {
    display: "-webkit-box",
    WebkitLineClamp: LINE_CLAMP,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  readMoreButton: {
    color: color.fgMuted,
    cursor: "pointer",
    paddingTop: space._1,
    textDecoration: {
      default: "none",
      ":hover": { default: null, [pointer.canHover]: "underline" },
    },
  },
  profileFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.bgSurfaceRaised,
    color: color.fgMuted,
  },
  errorText: {
    margin: 0,
    color: color.fgMuted,
    fontStyle: "italic",
  },
  filmographyTitle: {
    margin: 0,
  },
});

const filmStyles = stylex.create({
  root: {
    marginLeft: `calc(-1 * ${space._4})`,
    marginRight: `calc(-1 * ${space._4})`,
  },
  // The block padding is 0 because the room a card needs to grow on hover
  // comes from the row's clip margin, which the layout does not pay for.
  scrollContainer: {
    paddingBlock: 0,
    paddingLeft: space._4,
    paddingRight: space._4,
    scrollPaddingLeft: space._4,
    scrollPaddingRight: space._4,
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
    position: "absolute",
    inset: 0,
    borderRadius: 0,
  },
});
