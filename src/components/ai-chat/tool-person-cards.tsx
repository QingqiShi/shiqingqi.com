"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { t } from "#src/i18n.ts";
import type { PersonListItem } from "#src/utils/types.ts";
import { CompactPersonCard } from "./compact-person-card";
import { HorizontalScrollRow } from "./horizontal-scroll-row";
import { useMediaDetail } from "./media-detail-context";

interface ToolPersonCardsProps {
  items: ReadonlyArray<PersonListItem>;
}

export function ToolPersonCards({ items }: ToolPersonCardsProps) {
  const { setFocusedPerson } = useMediaDetail();

  if (items.length === 0) return null;

  return (
    <HorizontalScrollRow
      ariaLabel={t({ en: "People results", zh: "人物结果" })}
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
    </HorizontalScrollRow>
  );
}

const styles = stylex.create({
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
