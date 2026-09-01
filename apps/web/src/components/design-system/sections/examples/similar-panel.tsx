"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { TypesetPoster } from "./typeset-poster.tsx";
import type { Movie } from "./use-movies.ts";

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
