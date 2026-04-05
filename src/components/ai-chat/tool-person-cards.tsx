"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { useScrollFades } from "#src/hooks/use-scroll-fades.ts";
import { t } from "#src/i18n.ts";
import { scrollX } from "#src/primitives/layout.stylex.ts";
import { color, space } from "#src/tokens.stylex.ts";
import type { PersonListItem } from "#src/utils/types.ts";
import { CompactPersonCard } from "./compact-person-card";
import { HorizontalScrollButtons } from "./horizontal-scroll-buttons";
import { useMediaDetail } from "./media-detail-context";

interface ToolPersonCardsProps {
  items: ReadonlyArray<PersonListItem>;
}

export function ToolPersonCards({ items }: ToolPersonCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showLeftFade, showRightFade } = useScrollFades(scrollRef);
  const { setFocusedPerson } = useMediaDetail();

  if (items.length === 0) return null;

  return (
    <div css={styles.scrollWrapper}>
      <div
        ref={scrollRef}
        css={[scrollX.base, scrollX.focusRing, styles.scrollContainer]}
        role="list"
        aria-label={t({ en: "People results", zh: "人物结果" })}
        tabIndex={0}
      >
        {items.map((person) => (
          <div
            key={`person-${person.id}`}
            css={styles.cardWrapper}
            role="listitem"
          >
            <CompactPersonCard
              person={person}
              onClick={() => {
                setFocusedPerson({
                  id: person.id,
                  name: person.name,
                  profilePath: person.profilePath,
                });
              }}
            />
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
      <HorizontalScrollButtons
        scrollRef={scrollRef}
        showLeft={showLeftFade}
        showRight={showRightFade}
        leftCss={styles.scrollButtonLeft}
        rightCss={styles.scrollButtonRight}
      />
    </div>
  );
}

const styles = stylex.create({
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${space._3})`,
    marginRight: `calc(-1 * ${space._3})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    scrollSnapType: "x mandatory",
    padding: space._3,
    scrollPaddingLeft: space._3,
    scrollPaddingRight: space._3,
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
  scrollButtonLeft: {
    left: space._3,
  },
  scrollButtonRight: {
    right: space._3,
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
