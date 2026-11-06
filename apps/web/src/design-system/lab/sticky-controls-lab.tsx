"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { Switch } from "@tuja/ui/components/switch";
import stickyControlsDoc from "#src/_generated/props/sticky-controls.json";
import { defineLab } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const group = stylex.create({
  end: { marginInlineStart: "auto" },
});

const GROUP_SAMPLES: LabSample[] = [
  {
    id: "apart",
    label: { en: "Two groups apart", zh: "相隔的两组" },
    value: labSource(
      <>
        <StickyControlGroup>
          <Select
            label="Sort by"
            labelHidden
            size="sm"
            options={[
              { value: "newest", label: "Newest" },
              { value: "rated", label: "Highest rated" },
            ]}
          />
        </StickyControlGroup>
        <StickyControlGroup css={group.end}>
          <Button
            size="sm"
            look="ghost"
            aria-label="Reset filters"
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
        <Button size="sm">Movies</Button>
        <Button size="sm" look="ghost">
          TV
        </Button>
        <Button
          size="sm"
          look="ghost"
          aria-label="Refresh"
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
        <Switch label="Unwatched only" size="sm" defaultValue="off" />
      </StickyControlGroup>,
    ),
  },
];

export const StickyControlsLab = defineLab({
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
  controls: [{ prop: "children", samples: GROUP_SAMPLES }],
});
