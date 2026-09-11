"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, ratio, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/**
 * The shape the movie database builds its filter bar in: a media type toggle
 * at the start and a reset at the end, over the list they filter, so the page
 * between the two groups shows sharp between their blurs. The row goes
 * straight onto the docs page — no shell of its own, because a shell inside
 * the one this page already runs in is the thing `HeaderFooterLayout` forbids.
 * The list is long enough to scroll, which is what gives the row a page to
 * hold over.
 */
export function FilterBar() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const films = [
    {
      title: t({ en: "Blade Runner 2049", zh: "银翼杀手 2049" }),
      year: "2017",
    },
    { title: t({ en: "Arrival", zh: "降临" }), year: "2016" },
    { title: t({ en: "Dune", zh: "沙丘" }), year: "2021" },
    { title: t({ en: "Sicario", zh: "边境杀手" }), year: "2015" },
    { title: t({ en: "Prisoners", zh: "囚徒" }), year: "2013" },
    { title: t({ en: "Enemy", zh: "敌人" }), year: "2013" },
    { title: t({ en: "Incendies", zh: "焦土之城" }), year: "2010" },
    { title: t({ en: "Polytechnique", zh: "理工学院" }), year: "2009" },
    { title: t({ en: "Maelström", zh: "漩涡" }), year: "2000" },
  ];

  return (
    <>
      <StickyControls css={styles.bar}>
        <StickyControlGroup>
          <SegmentedControl
            aria-label={t({ en: "Media type", zh: "媒体类型" })}
            size="sm"
            value={mediaType}
            onChange={setMediaType}
            options={[
              { value: "movie", label: t({ en: "Movies", zh: "电影" }) },
              { value: "tv", label: t({ en: "TV", zh: "剧集" }) },
            ]}
          />
        </StickyControlGroup>
        <StickyControlGroup css={styles.trailing}>
          <Button
            size="sm"
            look="ghost"
            aria-label={t({ en: "Reset filters", zh: "重置筛选" })}
            icon={<FunnelXIcon />}
          />
        </StickyControlGroup>
      </StickyControls>
      <div css={[flex.col, styles.list]}>
        {films.map((film) => (
          <div key={film.title} css={[corner.radius_2, styles.row]}>
            <div css={[corner.radius_1, styles.poster]} />
            <div css={flex.col}>
              <Text look="bodySmall" weight="semibold">
                {film.title}
              </Text>
              <Text look="caption" tone="muted">
                {film.year}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const styles = stylex.create({
  // The row's measure and the gap under it belong to the consumer; the sticky
  // row only parks itself. Nothing here or above it clips: the blur's layers
  // are masked, and a squircle-cornered clip over them makes Chrome drop the
  // masks and render one flat blur.
  bar: {
    marginBlockEnd: space._3,
  },
  trailing: {
    marginInlineStart: "auto",
  },
  list: {
    gap: space._1,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._3,
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  // Stand-in for the artwork a real row carries, at the ratio a poster takes.
  poster: {
    flexShrink: 0,
    inlineSize: space._8,
    aspectRatio: ratio.poster,
    backgroundColor: color.bgSurfaceSunken,
  },
});
