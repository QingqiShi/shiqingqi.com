"use client";

import { Disclosure } from "@tuja/ui/components/disclosure";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { ItemChangeLine } from "#src/reader/quick-edit/use-item-change-button.tsx";
import { TripText } from "#src/reader/trip-text.tsx";
import type { RoadSignGlyph, SignSheet } from "#src/trips/types.ts";

// Italian road-sign palette (close to the real RAL colours).
const RED = "#cc1417";
const BLUE = "#0a4d9d";
const GREEN = "#077c4b";
const YELLOW = "#f7b500";
const INK = "#1a1a1a";

/** One road sign drawn as a pictograph. */
function SignGlyph({ glyph, size }: { glyph: RoadSignGlyph; size: number }) {
  switch (glyph) {
    case "roadColors":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <rect x="3" y="7" width="42" height="15" rx="2.5" fill={GREEN} />
          <text
            x="24"
            y="18"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#fff"
          >
            A1
          </text>
          <rect x="3" y="26" width="42" height="15" rx="2.5" fill={BLUE} />
          <text
            x="24"
            y="37"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#fff"
          >
            SS73
          </text>
        </svg>
      );
    case "noEntry":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <circle cx="24" cy="24" r="21" fill={RED} />
          <rect x="9" y="20.5" width="30" height="7" rx="1.5" fill="#fff" />
        </svg>
      );
    case "oneWay":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <rect x="2" y="15" width="44" height="18" rx="2.5" fill={BLUE} />
          <path d="M8 24h22" stroke="#fff" strokeWidth="5" />
          <path d="M28 16l12 8-12 8z" fill="#fff" />
        </svg>
      );
    case "giveWay":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <path d="M24 44 L2 6 H46 Z" fill={RED} />
          <path d="M24 35.5 L10.5 11.5 H37.5 Z" fill="#fff" />
        </svg>
      );
    case "priority":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <g transform="rotate(45 12 24)">
            <rect
              x="4"
              y="16"
              width="16"
              height="16"
              rx="2"
              fill="#fff"
              stroke="#c2c2c2"
            />
            <rect x="8" y="20" width="8" height="8" rx="1" fill={YELLOW} />
          </g>
          <g transform="rotate(45 36 24)">
            <rect
              x="28"
              y="16"
              width="16"
              height="16"
              rx="2"
              fill="#fff"
              stroke="#c2c2c2"
            />
            <rect x="32" y="20" width="8" height="8" rx="1" fill={YELLOW} />
          </g>
          <line
            x1="28"
            y1="32"
            x2="44"
            y2="16"
            stroke={INK}
            strokeWidth="2.5"
          />
        </svg>
      );
    case "noParking":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <circle
            cx="12.5"
            cy="24"
            r="10"
            fill={BLUE}
            stroke={RED}
            strokeWidth="3.5"
          />
          <line
            x1="6"
            y1="30.5"
            x2="19"
            y2="17.5"
            stroke={RED}
            strokeWidth="3"
          />
          <circle
            cx="35.5"
            cy="24"
            r="10"
            fill={BLUE}
            stroke={RED}
            strokeWidth="3.5"
          />
          <line
            x1="29"
            y1="30.5"
            x2="42"
            y2="17.5"
            stroke={RED}
            strokeWidth="3"
          />
          <line
            x1="29"
            y1="17.5"
            x2="42"
            y2="30.5"
            stroke={RED}
            strokeWidth="3"
          />
        </svg>
      );
    case "ztl":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <rect
            x="2"
            y="4"
            width="44"
            height="40"
            rx="3"
            fill="#fff"
            stroke="#bbb"
          />
          <circle
            cx="24"
            cy="18"
            r="9"
            fill="#fff"
            stroke={RED}
            strokeWidth="4.5"
          />
          <text
            x="24"
            y="40"
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="700"
            fill={INK}
          >
            ZTL
          </text>
        </svg>
      );
    case "speedLimit":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="#fff"
            stroke={RED}
            strokeWidth="6"
          />
          <text
            x="24"
            y="29.5"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            fill={INK}
          >
            50
          </text>
        </svg>
      );
    case "speedCamera":
      return (
        <svg viewBox="0 0 48 48" aria-hidden width={size} height={size}>
          <rect x="4" y="8" width="40" height="32" rx="3" fill={BLUE} />
          <rect
            x="12"
            y="18"
            width="17"
            height="12"
            rx="2"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
          />
          <circle
            cx="20.5"
            cy="24"
            r="3"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          />
          <path d="M31 21l6-3v12l-6-3z" fill="#fff" />
        </svg>
      );
  }
}

/**
 * A road-sign crib sheet: the signs themselves drawn as pictographs. The
 * collapsed header keeps the full strip of glyphs visible as a teaser; tap to
 * unfold each sign with its name and what to do about it.
 */
export function SignSheetCard({
  sheet,
}: {
  sheet: SignSheet & { id: string };
}) {
  return (
    <Disclosure
      look="card"
      summary={
        <span css={stack.tight}>
          <TripText>{sheet.title}</TripText>
          <span css={cluster.tight}>
            {sheet.signs.map((sign) => (
              <SignGlyph key={sign.name} glyph={sign.glyph} size={28} />
            ))}
          </span>
        </span>
      }
    >
      <div css={stack.item}>
        <List form="plain">
          {sheet.signs.map((sign) => (
            <ListRow
              key={sign.name}
              leading={<SignGlyph glyph={sign.glyph} size={40} />}
              detail={<TripText>{sign.meaning}</TripText>}
              wrap
            >
              <TripText>{sign.name}</TripText>
            </ListRow>
          ))}
        </List>
        {sheet.note ? (
          <Text look="caption" tone="muted">
            <TripText>{sheet.note}</TripText>
          </Text>
        ) : null}
        <ItemChangeLine id={sheet.id} name={sheet.title} />
      </div>
    </Disclosure>
  );
}
