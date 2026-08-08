"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { border, color, font, ratio, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef } from "react";
import { t } from "#src/i18n.ts";
import { Anchor } from "../shared/anchor";
import { useMediaTable } from "./media-table-context";
import type { MediaCellParams, MediaHeaderParams } from "./media-table-spec";
import { TmdbImage } from "./tmdb-image";

/** Rating out of 10 above which a score reads as "good". */
const SCORE_GOOD = 7;
/** Rating below which a score reads as "poor". */
const SCORE_POOR = 5;

function toPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/** Stands in for a poster that is missing or failed to load. */
function PosterFallback() {
  return (
    <span css={styles.posterEmpty} aria-hidden="true">
      🎬
    </span>
  );
}

/** Row number in the current (possibly sorted) view. */
export function MediaRowNumberCell({ rowIndex }: MediaCellParams) {
  return <span css={styles.rowNumber}>{rowIndex + 1}</span>;
}

export function MediaRowNumberHeader() {
  return <span css={a11y.srOnly}>{t({ en: "Row", zh: "行" })}</span>;
}

export function MediaTitleCell({ api, row }: MediaCellParams) {
  const { posterBaseUrl, posterSizes, hrefFor } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const media = row.data;

  const year = media.releaseDate?.slice(0, 4);
  const original =
    media.originalTitle && media.originalTitle !== media.title
      ? media.originalTitle
      : null;
  const meta = [year, original].filter(Boolean).join(" · ");

  return (
    <div css={styles.titleCell}>
      <span css={styles.poster}>
        {posterBaseUrl && posterSizes && media.posterPath ? (
          // `alt=""` — the title is right next to it as a real link, so
          // announcing the poster would just repeat it.
          <TmdbImage
            baseUrl={posterBaseUrl}
            sizeConfig={posterSizes}
            path={media.posterPath}
            alt=""
            // The thumbnail is a fixed 3.5rem tall at poster aspect ratio, so
            // roughly 37px wide; `srcSet` then picks w92 on a 2x display.
            sizes="37px"
            imgCss={styles.posterImage}
            skeletonFill
            errorFallback={<PosterFallback />}
          />
        ) : (
          <PosterFallback />
        )}
      </span>
      <span css={styles.titleText}>
        <Anchor
          href={hrefFor(media)}
          prefetch={false}
          rel="nofollow"
          css={[styles.titleLink, truncate.base]}
        >
          {media.title}
        </Anchor>
        {meta && <span css={[styles.titleMeta, truncate.base]}>{meta}</span>}
      </span>
    </div>
  );
}

export function MediaScoreCell({ api, row }: MediaCellParams) {
  const { rating } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const score = row.data.rating;
  if (typeof score !== "number" || score <= 0) {
    return <span css={styles.empty}>—</span>;
  }

  return (
    <div css={styles.meterCell}>
      <span css={styles.scoreValue}>{rating.format(score)}</span>
      <span
        aria-hidden="true"
        css={[
          styles.meterTrack,
          styles.meterTrackFill(`${String(toPercent(score, 10))}%`),
        ]}
      >
        <span
          css={[
            styles.meterFill,
            score >= SCORE_GOOD && styles.meterFillGood,
            score < SCORE_POOR && styles.meterFillPoor,
          ]}
        />
      </span>
    </div>
  );
}

export function MediaVotesCell({ api, row }: MediaCellParams) {
  const { compact } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const votes = row.data.voteCount;
  if (typeof votes !== "number") return <span css={styles.empty}>—</span>;

  return <span css={styles.numeric}>{compact.format(votes)}</span>;
}

export function MediaReleaseDateCell({ api, row }: MediaCellParams) {
  const { date } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const iso = row.data.releaseDate;
  if (!iso) return <span css={styles.empty}>—</span>;

  // TMDB dates are plain calendar days. Parsing them as UTC and formatting in
  // UTC keeps a January 1st release from slipping to December 31st for anyone
  // west of Greenwich.
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return <span css={styles.empty}>—</span>;
  }

  return <span css={styles.date}>{date.format(parsed)}</span>;
}

export function MediaPopularityCell({ api, row }: MediaCellParams) {
  const { compact, maxPopularity } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const popularity = row.data.popularity;
  if (typeof popularity !== "number") return <span css={styles.empty}>—</span>;

  return (
    <div css={styles.meterCell}>
      <span css={styles.numeric}>{compact.format(popularity)}</span>
      <span
        aria-hidden="true"
        css={[
          styles.meterTrack,
          styles.meterTrackFill(
            `${String(toPercent(popularity, maxPopularity))}%`,
          ),
        ]}
      >
        <span css={[styles.meterFill, styles.meterFillAccent]} />
      </span>
    </div>
  );
}

export function MediaGenresCell({ api, row }: MediaCellParams) {
  const { genreNames } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const names = (row.data.genreIds ?? [])
    .map((id) => genreNames.get(id))
    .filter((name) => name !== undefined);

  if (!names.length) return <span css={styles.empty}>—</span>;

  const shown = names.slice(0, 2);
  const overflow = names.length - shown.length;

  return (
    <div css={styles.chipRow} title={names.join(", ")}>
      {shown.map((name) => (
        <span key={name} css={[styles.chip, truncate.base]}>
          {name}
        </span>
      ))}
      {overflow > 0 && <span css={styles.chipMore}>+{overflow}</span>}
    </div>
  );
}

export function MediaLanguageCell({ api, column, row }: MediaCellParams) {
  const value = api.columnField(column, row);
  if (typeof value !== "string" || !value) {
    return <span css={styles.empty}>—</span>;
  }
  return <span css={[styles.language, truncate.base]}>{value}</span>;
}

export function MediaOverviewCell({ api, row }: MediaCellParams) {
  if (!api.rowIsLeaf(row)) return null;
  const overview = row.data.overview;
  if (!overview) return <span css={styles.empty}>—</span>;

  return (
    <span css={[styles.overview, truncate.base]} title={overview}>
      {overview}
    </span>
  );
}

/**
 * Mirrors the sort state onto the element that owns `role="columnheader"`.
 *
 * That element is LyteNyte's header cell, not anything we render, and the grid
 * never sets `aria-sort` itself — but `aria-sort` is only meaningful there, so
 * a screen reader reading the table has nowhere else to learn which column is
 * sorted. Returns a ref to attach to whatever the renderer puts inside.
 */
function useAriaSort<T extends HTMLElement>(
  value: "ascending" | "descending" | "none" | null,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (value === null) return undefined;
    const header = ref.current?.closest('[role="columnheader"]');
    if (!header) return undefined;
    header.setAttribute("aria-sort", value);
    return () => {
      header.removeAttribute("aria-sort");
    };
  }, [value]);

  return ref;
}

/**
 * Sortable column header. The whole header is a button so the sort cycle is
 * reachable by keyboard; the state is spelled out for screen readers because
 * the caret alone carries the meaning visually.
 */
export function MediaTableHeader({ column }: MediaHeaderParams) {
  const { toggleSort } = useMediaTable();
  const label = column.name ?? column.id;

  const ascendingLabel = t({ en: "sorted ascending", zh: "升序排列" });
  const descendingLabel = t({ en: "sorted descending", zh: "降序排列" });

  // `null` rather than `"none"` for a column that cannot be sorted: the
  // attribute's presence is itself the claim that sorting is available.
  const headerRef = useAriaSort<HTMLButtonElement>(
    column.unsortable
      ? null
      : column.sort === "asc"
        ? "ascending"
        : column.sort === "desc"
          ? "descending"
          : "none",
  );

  if (column.unsortable) {
    return <span css={[styles.headerLabel, truncate.base]}>{label}</span>;
  }

  const isNumeric = column.type === "number";

  return (
    <button
      ref={headerRef}
      type="button"
      css={[
        buttonReset.base,
        styles.headerButton,
        isNumeric && styles.headerButtonNumeric,
        !!column.sort && styles.headerButtonActive,
      ]}
      onClick={() => {
        toggleSort(column.id);
      }}
    >
      <span css={[styles.headerLabel, truncate.base]}>{label}</span>
      <span css={[styles.headerIcon, !!column.sort && styles.headerIconActive]}>
        {column.sort === "asc" ? (
          <ArrowUpIcon weight="bold" />
        ) : column.sort === "desc" ? (
          <ArrowDownIcon weight="bold" />
        ) : (
          <ArrowsDownUpIcon weight="bold" />
        )}
      </span>
      {column.sort && (
        <span css={a11y.srOnly}>
          {column.sort === "asc" ? ascendingLabel : descendingLabel}
        </span>
      )}
    </button>
  );
}

const styles = stylex.create({
  rowNumber: {
    color: color.textSubtle,
    fontSize: font.uiCaption,
    fontVariantNumeric: "tabular-nums",
  },

  titleCell: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    inlineSize: "100%",
    minInlineSize: 0,
    blockSize: "100%",
  },
  poster: {
    position: "relative",
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    blockSize: "3.5rem",
    aspectRatio: ratio.poster,
    overflow: "hidden",
    borderRadius: border.radius_1,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `0 0 0 1px ${color.neutralBorder}`,
  },
  posterImage: {
    inlineSize: "100%",
    blockSize: "100%",
    objectFit: "cover",
  },
  posterEmpty: {
    fontSize: font.uiBodySmall,
    opacity: 0.5,
  },
  titleText: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  titleLink: {
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_2,
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
  },
  titleMeta: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_2,
  },

  meterCell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.35rem",
    inlineSize: "100%",
  },
  meterTrack: {
    position: "relative",
    inlineSize: "100%",
    blockSize: "3px",
    overflow: "hidden",
    borderRadius: border.radius_round,
    backgroundColor: color.surfaceNeutralSubtle,
  },
  meterTrackFill: (percent: string) => ({
    "--media-meter": percent,
  }),
  meterFill: {
    display: "block",
    inlineSize: "var(--media-meter, 0%)",
    blockSize: "100%",
    borderRadius: border.radius_round,
    backgroundColor: color.warning,
  },
  meterFillGood: {
    backgroundColor: color.success,
  },
  meterFillPoor: {
    backgroundColor: color.danger,
  },
  meterFillAccent: {
    backgroundColor: color.accent,
  },
  scoreValue: {
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    fontVariantNumeric: "tabular-nums",
  },

  numeric: {
    color: color.textMuted,
    fontSize: font.uiBodySmall,
    fontVariantNumeric: "tabular-nums",
  },
  date: {
    color: color.textMuted,
    fontSize: font.uiBodySmall,
    fontVariantNumeric: "tabular-nums",
  },
  empty: {
    color: color.textSubtle,
  },

  chipRow: {
    display: "flex",
    alignItems: "center",
    gap: space._0,
    minInlineSize: 0,
  },
  chip: {
    maxInlineSize: "8rem",
    paddingBlock: space._00,
    paddingInline: space._1,
    borderRadius: border.radius_round,
    backgroundColor: color.surfaceAccentSubtle,
    color: color.accentText,
    fontSize: font.uiOverline,
    fontWeight: font.weight_5,
    whiteSpace: "nowrap",
  },
  chipMore: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
    fontWeight: font.weight_5,
  },

  language: {
    color: color.textMuted,
    fontSize: font.uiBodySmall,
  },
  overview: {
    color: color.textSubtle,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
  },

  headerButton: {
    display: "flex",
    alignItems: "center",
    gap: space._0,
    inlineSize: "100%",
    blockSize: "100%",
    minInlineSize: 0,
    color: {
      default: "inherit",
      ":hover": color.textMain,
    },
    cursor: "pointer",
  },
  headerButtonNumeric: {
    justifyContent: "flex-end",
  },
  headerButtonActive: {
    color: color.accentText,
  },
  headerLabel: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
  },
  headerIcon: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    // Kept visible but recessive: every sortable header advertises the
    // affordance without the column labels turning into a row of arrows.
    opacity: 0.35,
    transitionProperty: "opacity",
    transitionDuration: "150ms",
  },
  headerIconActive: {
    opacity: 1,
  },
});
