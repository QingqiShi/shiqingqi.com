"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useScrollFades } from "#src/hooks/use-scroll-fades.ts";
import { t } from "#src/i18n.ts";
import { border, color, font, ratio, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { PosterImage } from "../movie-database/poster-image";

interface RecommendedMediaRowProps {
  title: string;
  items: ReadonlyArray<MediaListItem>;
}

export function RecommendedMediaRow({
  title,
  items,
}: RecommendedMediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftFade, showRightFade } = useScrollFades(scrollRef);

  if (items.length === 0) return null;

  return (
    <section css={styles.section}>
      <h2 css={styles.title}>{title}</h2>
      <div css={styles.scrollWrapper}>
        <div
          ref={scrollRef}
          css={styles.scrollContainer}
          role="region"
          aria-label={title}
          tabIndex={0}
        >
          {items.map((item) => (
            <div key={item.id} css={styles.cardWrapper}>
              <CompactCard media={item} />
            </div>
          ))}
        </div>
        <div
          css={[styles.fadeEdge, styles.fadeLeft]}
          style={{ opacity: showLeftFade ? 1 : 0 }}
          aria-hidden="true"
        />
        <div
          css={[styles.fadeEdge, styles.fadeRight]}
          style={{ opacity: showRightFade ? 1 : 0 }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}

function CompactCard({ media }: { media: MediaListItem }) {
  const locale = useLocale();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <div css={styles.compactCard}>
      {media.posterPath && media.title ? (
        <PosterImage posterPath={media.posterPath} alt={media.title} />
      ) : (
        <div css={styles.noPoster}>
          <div>{media.title}</div>
          <div css={styles.noPosterLabel}>
            {t({ en: "No Poster", zh: "无海报" })}
          </div>
        </div>
      )}
      {media.rating ? (
        <div
          css={styles.compactRating}
          aria-label={`${t({ en: "User rating", zh: "用户评分" })}: ${formatter.format(media.rating)}`}
        >
          {formatter.format(media.rating)}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal inset from viewport edge to content inside ChatMessageList.
 * Padding chain: layout (space._3 + safe-area) + ChatMessageList (space._3).
 * See also: ai-chat-view.tsx inputArea which uses the same offsets.
 */
const contentInsetLeft = `calc(${space._3} + ${space._3} + env(safe-area-inset-left, 0px))`;
const contentInsetRight = `calc(${space._3} + ${space._3} + env(safe-area-inset-right, 0px))`;

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  title: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: 0,
  },
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${contentInsetLeft})`,
    marginRight: `calc(-1 * ${contentInsetRight})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollbarWidth: "none",
    paddingBottom: space._1,
    paddingLeft: contentInsetLeft,
    paddingRight: contentInsetRight,
    scrollPaddingLeft: contentInsetLeft,
    scrollPaddingRight: contentInsetRight,
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
    backgroundImage: `linear-gradient(to left, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  fadeRight: {
    right: 0,
    backgroundImage: `linear-gradient(to right, rgba(${color.backgroundMainChannels}, 0), rgba(${color.backgroundMainChannels}, 1))`,
  },
  cardWrapper: {
    flexShrink: 0,
    scrollSnapAlign: "start",
    width: "130px",
    [breakpoints.sm]: {
      width: "140px",
    },
    [breakpoints.md]: {
      width: "155px",
    },
    [breakpoints.lg]: {
      width: "175px",
    },
  },
  compactCard: {
    position: "relative",
    aspectRatio: ratio.poster,
    width: "100%",
    borderRadius: border.radius_2,
    overflow: "hidden",
  },
  noPoster: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    backgroundColor: color.backgroundRaised,
    fontSize: font.uiBodySmall,
  },
  noPosterLabel: {
    fontSize: "0.7rem",
    color: color.textMuted,
  },
  compactRating: {
    position: "absolute",
    top: space._0,
    left: space._0,
    width: "1.4rem",
    height: "1.4rem",
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    borderWidth: "1.5px",
    borderColor: color.textMain,
    borderStyle: "solid",
    fontSize: "0.6rem",
    fontWeight: font.weight_6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});
