"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import headerFooterLayoutDoc from "#src/_generated/props/header-footer-layout.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const article = stylex.create({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    maxInlineSize: measure.prose,
    // The content flows up under the header controls, so a text page keeps
    // clear of them itself.
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBlockEnd: space._6,
  },
});

const wash = stylex.create({
  base: {
    position: "absolute",
    insetInline: 0,
    insetBlockStart: 0,
    blockSize: space._13,
    backgroundImage: `linear-gradient(${color.bgNeutralSubtle}, transparent)`,
  },
});

const ARTICLE = labSource(
  <article css={article.base}>
    <Heading level={2}>The quiet harbour</Heading>
    <Text tone="muted">
      A reading page gets one centred measure and room to breathe. A back link
      on the left, utilities on the right, and nothing else competes with the
      text.
    </Text>
    <Text tone="muted">
      The background runs edge to edge beneath the content. Each floating group
      takes the pointer only on its own controls, so text stays selectable up to
      the top edge.
    </Text>
    <Text tone="muted">
      The controls stay where they are while the page scrolls under them.
    </Text>
    <Text tone="muted">
      The footer shares the width and the gutters of the column, so the page
      reads as one measure from the headline to the colophon.
    </Text>
  </article>,
);

const HEADER_START_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "back",
    label: { en: "Back", zh: "返回" },
    value: labSource(
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowLeftIcon weight="bold" />}
        aria-label="Back"
      />,
    ),
  },
];

const HEADER_END_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "utilities",
    label: { en: "Utilities", zh: "实用控件" },
    value: labSource(
      <>
        <Button
          size="sm"
          look="ghost"
          icon={<MagnifyingGlassIcon weight="bold" />}
          aria-label="Search"
        />
        <Button
          size="sm"
          look="ghost"
          icon={<GearSixIcon weight="bold" />}
          aria-label="Settings"
        />
      </>,
    ),
  },
];

const BACKGROUND_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "wash",
    label: { en: "Wash", zh: "渐变" },
    value: labSource(<div css={wash.base} />),
  },
];

const FOOTER_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "colophon",
    label: { en: "Colophon", zh: "版权信息" },
    value: labSource(
      <footer>
        <Text as="p" look="caption" tone="muted">
          Written by the harbour, 2026
        </Text>
      </footer>,
    ),
  },
];

const BASE = {
  as: "div",
  children: ARTICLE,
} as const;

export const HeaderFooterLayoutLab = defineLab({
  doc: headerFooterLayoutDoc,
  component: HeaderFooterLayout,
  scene: "page",
  variants: [
    {
      id: "reading",
      label: { en: "Reading page", zh: "阅读页" },
      props: {
        ...BASE,
        pageColumn: true,
        headerStart: "back",
        headerEnd: "utilities",
        background: "wash",
        footer: "colophon",
      },
    },
    {
      id: "narrow",
      label: { en: "Narrow column", zh: "窄内容列" },
      props: {
        ...BASE,
        contentMaxInlineSize: "36rem",
        headerStart: "back",
        headerEnd: "utilities",
        footer: "colophon",
      },
    },
    {
      id: "wide",
      label: { en: "Wide header", zh: "宽页头" },
      props: {
        ...BASE,
        pageColumn: true,
        wideHeader: true,
        headerStart: "back",
        headerEnd: "utilities",
      },
    },
    {
      id: "plain",
      label: { en: "Content only", zh: "仅内容" },
      props: { ...BASE, pageColumn: true },
    },
  ],
  controls: [
    { prop: "headerStart", samples: HEADER_START_SAMPLES },
    { prop: "headerEnd", samples: HEADER_END_SAMPLES },
    { prop: "background", samples: BACKGROUND_SAMPLES },
    { prop: "footer", samples: FOOTER_SAMPLES },
    "pageColumn",
    "wideHeader",
    "contentMaxInlineSize",
  ],
});
