"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { Switch } from "@tuja/ui/components/switch";
import stickyControlsDoc from "#src/_generated/props/sticky-controls.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const group = stylex.create({
  end: { marginInlineStart: "auto" },
});

export function StickyControlsLab() {
  const newest = t({ en: "Newest", zh: "最新" });
  const highestRated = t({ en: "Highest rated", zh: "评分最高" });
  const unwatchedOnly = t({ en: "Unwatched only", zh: "仅看未看过的" });

  const groupSamples: LabSample[] = [
    {
      id: "apart",
      label: { en: "Two groups apart", zh: "相隔的两组" },
      value: labSource(
        <>
          <StickyControlGroup>
            <Select
              label={t({ en: "Sort by", zh: "排序方式" })}
              labelHidden
              size="sm"
              options={[
                { value: "newest", label: newest },
                { value: "rated", label: highestRated },
              ]}
            />
          </StickyControlGroup>
          <StickyControlGroup css={group.end}>
            <Button
              size="sm"
              look="ghost"
              aria-label={t({ en: "Reset filters", zh: "重置筛选" })}
              icon={<FunnelXIcon weight="bold" />}
            />
          </StickyControlGroup>
        </>,
      ),
    },
    {
      id: "one",
      label: { en: "One group", zh: "一组" },
      value: labSource(
        <StickyControlGroup>
          <Button size="sm">{t({ en: "Movies", zh: "电影" })}</Button>
          <Button size="sm" look="ghost">
            {t({ en: "TV", zh: "剧集" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            aria-label={t({ en: "Refresh", zh: "刷新" })}
            icon={<ArrowClockwiseIcon weight="bold" />}
          />
        </StickyControlGroup>,
      ),
    },
    {
      id: "switch",
      label: { en: "With a switch", zh: "带开关" },
      value: labSource(
        <StickyControlGroup>
          <Switch label={unwatchedOnly} size="sm" defaultValue="off" />
        </StickyControlGroup>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: stickyControlsDoc,
        component: StickyControls,
        scene: "scroll",
        variants: [
          {
            id: "apart",
            label: { en: "Two groups", zh: "两组" },
            props: { children: "apart" },
          },
          {
            id: "one",
            label: { en: "One group", zh: "一组" },
            props: { children: "one" },
          },
          {
            id: "switch",
            label: { en: "With a switch", zh: "带开关" },
            props: { children: "switch" },
          },
        ],
        controls: [{ prop: "children", samples: groupSamples }],
      }}
    />
  );
}
