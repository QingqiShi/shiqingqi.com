"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { TilesInput } from "#src/pet/build-view.ts";
import { formatTokens, formatUsd } from "#src/pet/format-tokens.ts";
import type { PetCopy } from "#src/pet/types.ts";

/** The range in four tiles, each a figure and a small drawing of it, as the Mac's pane shows. */
export function PetTiles({
  tiles,
  copy,
}: {
  tiles: TilesInput;
  copy: PetCopy;
}) {
  const todayLabel = t({ en: "Today", zh: "今天" });

  return (
    <dl css={styles.tiles}>
      {tiles.tokens <= 0 ? null : (
        <Tile
          label={tiles.tokensLabel}
          value={formatTokens(tiles.tokens)}
          cue={<Bars values={tiles.bars} />}
        />
      )}
      {tiles.costUsd <= 0 ? null : (
        <Tile
          label={copy.tiles.cost}
          value={formatUsd(tiles.costUsd)}
          cue={
            tiles.todayUsd <= 0 ? null : (
              <span
                css={[
                  typeRole.caption,
                  typeModifier.numeric,
                  corner.radius_round,
                  styles.pill,
                ]}
              >
                <span css={a11y.srOnly}>{todayLabel} </span>+
                {formatUsd(tiles.todayUsd)}
              </span>
            )
          }
        />
      )}
      {tiles.streak <= 0 ? null : (
        <Tile
          label={copy.tiles.streak}
          value={String(tiles.streak)}
          unit={copy.tiles.streakUnit}
          cue={<Week days={tiles.week} />}
        />
      )}
      {tiles.cacheHitRate <= 0 ? null : (
        <Tile
          label={copy.tiles.cacheHit}
          value={`${(tiles.cacheHitRate * 100).toFixed(1)}%`}
          cue={<Ring rate={tiles.cacheHitRate} />}
        />
      )}
    </dl>
  );
}

function Tile({
  label,
  value,
  unit,
  cue,
}: {
  label: string;
  value: string;
  unit?: string;
  cue: ReactNode;
}) {
  return (
    <Card padding="sm" css={styles.tile}>
      <Text as="dt" look="caption" tone="muted">
        {label}
      </Text>
      <dd css={styles.tileBody}>
        <span css={styles.tileValue}>
          <span css={[typeRole.h1, typeModifier.numeric]}>{value}</span>
          {unit === undefined ? null : (
            <Text as="span" look="caption" tone="muted">
              {unit}
            </Text>
          )}
        </span>
        {cue === null ? null : <span css={styles.tileCue}>{cue}</span>}
      </dd>
    </Card>
  );
}

const BAR_HEIGHT = 22;

/** The tokens of the last ten days, today last and in clay. */
function Bars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const barsWidth = values.length * 4 - 1;

  return (
    <svg
      aria-hidden="true"
      width={barsWidth}
      height={BAR_HEIGHT}
      viewBox={`0 0 ${String(barsWidth)} ${String(BAR_HEIGHT)}`}
      css={styles.cueSvg}
    >
      {values.map((v, i) => {
        const h = Math.max(1.5, (v / max) * BAR_HEIGHT);
        const isToday = i === values.length - 1;
        return (
          <rect
            key={i}
            x={i * 4}
            y={BAR_HEIGHT - h}
            width={3}
            height={h}
            rx={1}
            css={isToday ? styles.clayFill : styles.barFill}
          />
        );
      })}
    </svg>
  );
}

/** One square for each of the last seven days, filled when Claude was used. */
function Week({ days }: { days: boolean[] }) {
  const weekWidth = days.length * 8 - 2;

  return (
    <svg
      aria-hidden="true"
      width={weekWidth}
      height={6}
      viewBox={`0 0 ${String(weekWidth)} 6`}
      css={styles.cueSvg}
    >
      {days.map((isOn, i) => (
        <rect
          key={i}
          x={i * 8}
          y={0}
          width={6}
          height={6}
          rx={1.5}
          css={isOn ? styles.clayFill : styles.trackFill}
        />
      ))}
    </svg>
  );
}

const RING_R = 11;
const RING_C = 2 * Math.PI * RING_R;

function Ring({ rate }: { rate: number }) {
  const off = RING_C * (1 - Math.max(0, Math.min(1, rate)));

  return (
    <svg
      aria-hidden="true"
      width={28}
      height={28}
      viewBox="0 0 28 28"
      css={styles.cueSvg}
    >
      <circle
        cx={14}
        cy={14}
        r={RING_R}
        fill="none"
        strokeWidth={4}
        css={styles.trackStroke}
      />
      <circle
        cx={14}
        cy={14}
        r={RING_R}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={off}
        transform="rotate(-90 14 14)"
        css={styles.clayStroke}
      />
    </svg>
  );
}

/** The clay of the pet's drawings, so that the tiles mark today as the trend drawing does. */
const CLAY = "#D97757";
const CLAY_TEXT = "light-dark(#B4532F, #E8906F)";
const CLAY_SUBTLE = "rgba(217, 119, 87, 0.16)";

const styles = stylex.create({
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: rhythm.tight,
    margin: 0,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: rhythm.inline,
    containerType: "inline-size",
    minInlineSize: 0,
  },
  tileBody: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: rhythm.tight,
    rowGap: rhythm.inline,
    margin: 0,
  },
  tileValue: {
    display: "flex",
    alignItems: "baseline",
    gap: rhythm.inline,
    minInlineSize: 0,
    whiteSpace: "nowrap",
  },
  tileCue: {
    display: "flex",
    alignItems: "flex-end",
    marginInlineStart: "auto",
    paddingBlockEnd: "0.3em",
    lineHeight: 0,
  },
  cueSvg: {
    display: "block",
    overflow: "visible",
  },
  pill: {
    lineHeight: font.lineHeight_4,
    paddingInline: space._1,
    color: CLAY_TEXT,
    backgroundColor: CLAY_SUBTLE,
    whiteSpace: "nowrap",
  },
  barFill: {
    fill: color.mutedForeground,
    fillOpacity: 0.35,
  },
  trackFill: {
    fill: color.mutedForeground,
    fillOpacity: 0.18,
  },
  clayFill: {
    fill: CLAY,
  },
  trackStroke: {
    stroke: color.mutedForeground,
    strokeOpacity: 0.18,
  },
  clayStroke: {
    stroke: CLAY,
  },
});
