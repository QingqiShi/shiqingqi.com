"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { measure } from "../../measure.stylex.ts";
import type { Credit, Movie } from "./movie-detail-data.ts";
import { TypesetPoster } from "./typeset-poster.tsx";

/**
 * The three view panels behind the screen's `SegmentedControl`.
 *
 * They are separate components rather than three branches inside one render for
 * a hard reason: in a client module the i18n transform compiles every `t()` call
 * to a `useI18nLookup` hook, so a `t()` reached only when one view is active
 * would change the hook call order the moment the viewer switched views. A
 * component boundary makes each panel's lookups unconditional within its own
 * render, which is what lets the screen mount exactly one panel at a time.
 */

/** The Overview — TMDB's word for the plot synopsis, not a summary of the page. */
export function OverviewPanel({ overview }: { overview: string }) {
  return (
    <Text wrap="pretty" css={styles.prose}>
      {overview}
    </Text>
  );
}

/** The cast half of the Credits, as Avatar monograms — the exemplar has no portraits. */
export function CastPanel({ cast }: { cast: Credit[] }) {
  return (
    <ul css={styles.castList} aria-label={t({ en: "Cast", zh: "演员" })}>
      {cast.map((credit) => (
        <li key={credit.name} css={styles.credit}>
          <Avatar name={credit.name} size="md" />
          <span css={styles.creditText}>
            <Text as="span" variant="bodySmall" weight="medium">
              {credit.name}
            </Text>
            <Text as="span" variant="caption" tone="subtle">
              {credit.character}
            </Text>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface SimilarPanelProps {
  movies: Movie[];
  onSelect: (id: string) => void;
}

/** Similar — more Movies like this one, and the control that switches to them. */
export function SimilarPanel({ movies, onSelect }: SimilarPanelProps) {
  return (
    <ul
      css={styles.similarList}
      aria-label={t({ en: "Similar movies", zh: "相似影片" })}
    >
      {movies.map((movie) => (
        <li key={movie.id}>
          {/*
            A real `<button>` composing `cardSurface`, not a clickable `<div>`
            and not an anchor to nowhere. It loads the Movie into the screen
            above, which is the one thing a Similar card on a details page is
            for — so the card is announced as a control that does what it says,
            and the exemplar keeps its promise that the state on this page is
            real. This is the escape hatch the Card page documents, used exactly
            as written there.
          */}
          <button
            type="button"
            onClick={() => {
              onSelect(movie.id);
            }}
            css={[
              transition.colors,
              cardSurface.base,
              cardSurface.interactive,
              styles.similarCard,
            ]}
          >
            {/* The poster carries the title, so the caption underneath adds only
                what the plate doesn't say. Both are real text inside the button,
                so it still announces "The Salt Line 2022 · 7.2". */}
            <TypesetPoster title={movie.title} />
            <Text as="span" variant="caption" tone="subtle" numeric>
              {`${movie.year} · ${movie.rating}`}
            </Text>
          </button>
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  prose: {
    maxInlineSize: measure.prose,
  },
  // Capped, so six credits settle into two tidy rows of three rather than
  // stretching into one long line of six with an Avatar every 180px.
  castList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(10.5rem, 1fr))",
    gap: space._3,
    margin: 0,
    padding: 0,
    maxInlineSize: "36rem",
    listStyle: "none",
  },
  credit: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    minInlineSize: 0,
  },
  creditText: {
    display: "flex",
    flexDirection: "column",
    // Both children are inline spans, so the column needs its own floor to stop
    // a long name from pushing the Avatar out of the row.
    minInlineSize: 0,
  },
  // Three across at every width, never wrapping. A Similar row is read as a row
  // — reflowing three cards into two-plus-one at 390px turns a comparison into a
  // ragged list, and the posters have a fixed aspect ratio so they simply get
  // smaller instead.
  similarList: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: { default: space._2, [breakpoints.md]: space._3 },
    margin: 0,
    padding: 0,
    // The same cap the cast list carries, so the two panels that hold a grid
    // stop at the same edge and neither reads as a row with a card missing off
    // the end. It is also what keeps a thumbnail clearly smaller than the hero's
    // own plate, which is the difference between a footnote and a second lead.
    maxInlineSize: "36rem",
    listStyle: "none",
  },
  similarCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: space._1,
    inlineSize: "100%",
    blockSize: "100%",
    padding: space._2,
    color: color.textMain,
    textAlign: "start",
    // A `button` brings the UA's own font family and a centred label with it,
    // and no leaf inside the card sets a family of its own. The rest of the skin
    // is `cardSurface`.
    fontFamily: "inherit",
    cursor: "pointer",
  },
});
