"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollbar } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import scrollMaskDoc from "#src/_generated/props/scroll-mask.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

// The root carries the surface, so the region blurs at its own edge.
const region = stylex.create({
  base: {
    inlineSize: "24rem",
    maxInlineSize: "100%",
    blockSize: "12rem",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
});

const rowRegion = stylex.create({
  base: {
    inlineSize: "24rem",
    maxInlineSize: "100%",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
});

const content = stylex.create({
  padded: { padding: space._5 },
  underChrome: { paddingInline: space._5 },
});

const row = stylex.create({
  base: { display: "flex", gap: rhythm.item, padding: space._5 },
});

const chrome = stylex.create({
  bar: {
    display: "flex",
    justifyContent: "flex-end",
    paddingBlock: space._3,
  },
  header: {
    paddingBlock: space._3,
  },
});

const card = stylex.create({
  base: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    inlineSize: "9.5rem",
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurfaceSunken,
  },
});

const CONTENT_SAMPLES: LabSample[] = [
  {
    id: "prose",
    label: { en: "Long text", zh: "长文本" },
    value: labSource(
      <>
        <Text look="bodySmall">
          Thirty years on, a new blade runner turns up a secret buried deep
          enough to unsettle what is left of the city.
        </Text>
        <Text look="bodySmall">
          The trail leads to a former blade runner who dropped out of sight
          three decades ago.
        </Text>
        <Text look="bodySmall">
          Every answer costs him something he was sure of when he started.
        </Text>
        <Text look="bodySmall">
          The rain does not stop, and the archives are gone.
        </Text>
        <Text look="bodySmall" tone="muted">
          What he does with it is the one part no file records.
        </Text>
      </>,
    ),
  },
  {
    id: "short",
    label: { en: "Text that fits", zh: "放得下的文本" },
    value: labSource(
      <>
        <Text look="bodySmall">
          Denis Villeneuve, 2017. Roger Deakins shot it, and won for it.
        </Text>
        <Text look="bodySmall" tone="muted">
          163 minutes, and none of them hurried.
        </Text>
      </>,
    ),
  },
  {
    id: "cards",
    label: { en: "A row of cards", zh: "一行卡片" },
    value: labSource(
      <>
        {["Blade Runner 2049", "Arrival", "Dune", "Sicario", "Prisoners"].map(
          (title) => (
            <div key={title} css={[corner.radius_2, card.base]}>
              <Text look="bodySmall" weight="semibold">
                {title}
              </Text>
            </div>
          ),
        )}
      </>,
    ),
  },
];

const END_CHROME_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "bar",
    label: { en: "Action bar", zh: "操作栏" },
    value: labSource(
      <div css={chrome.bar}>
        <Button size="sm">Save changes</Button>
      </div>,
    ),
  },
];

const START_CHROME_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "header",
    label: { en: "Header row", zh: "标题行" },
    value: labSource(
      <div css={chrome.header}>
        <Text look="bodySmall" weight="semibold">
          Synopsis
        </Text>
      </div>,
    ),
  },
];

const SCROLL_BUTTON_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "labels",
    label: { en: "With labels", zh: "带名称" },
    value: { startLabel: "Scroll back", endLabel: "Scroll on" },
  },
];

const VERTICAL_CSS = labSource([corner.radius_3, region.base]);
const PADDED_CONTENT = labSource([
  stack.item,
  content.padded,
  scrollbar.autoHide,
]);

export const ScrollMaskLab = defineLab({
  doc: scrollMaskDoc,
  component: ScrollMask,
  variants: [
    {
      id: "vertical",
      label: { en: "Vertical", zh: "纵向" },
      props: {
        children: "prose",
        css: VERTICAL_CSS,
        contentCss: PADDED_CONTENT,
      },
    },
    {
      id: "horizontal",
      label: { en: "Horizontal", zh: "横向" },
      props: {
        orientation: "horizontal",
        children: "cards",
        scrollButtons: "labels",
        "aria-label": "Films",
        css: labSource([corner.radius_3, rowRegion.base]),
        contentCss: labSource([row.base]),
      },
    },
    {
      id: "chrome",
      label: { en: "Under chrome", zh: "界面元素之下" },
      props: {
        children: "prose",
        startChrome: "header",
        endChrome: "bar",
        css: VERTICAL_CSS,
        contentCss: labSource([stack.item, content.underChrome]),
      },
    },
    {
      id: "strong",
      label: { en: "Deep and strong", zh: "更深更强" },
      props: {
        children: "prose",
        radius: 24,
        depth: "3rem",
        css: VERTICAL_CSS,
        contentCss: PADDED_CONTENT,
      },
    },
    {
      id: "fits",
      label: { en: "Content that fits", zh: "内容放得下" },
      props: {
        children: "short",
        css: VERTICAL_CSS,
        contentCss: PADDED_CONTENT,
      },
    },
  ],
  controls: [
    { prop: "children", samples: CONTENT_SAMPLES },
    "orientation",
    { prop: "radius", range: { min: 0, max: 32 } },
    "depth",
    "startMask",
    { prop: "startChrome", samples: START_CHROME_SAMPLES },
    { prop: "endChrome", samples: END_CHROME_SAMPLES },
    { prop: "scrollButtons", samples: SCROLL_BUTTON_SAMPLES },
    "clipMargin",
  ],
});
