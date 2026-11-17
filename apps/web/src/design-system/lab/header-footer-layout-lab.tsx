"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { measure, rhythm, safeArea, space } from "@tuja/ui/tokens.stylex";
import headerFooterLayoutDoc from "#src/_generated/props/header-footer-layout.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
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
    paddingBlockStart: `calc(${space._10} + ${safeArea.blockStart})`,
    paddingBlockEnd: space._6,
  },
});

const wash = stylex.create({
  base: {
    position: "absolute",
    insetInline: 0,
    insetBlockStart: 0,
    blockSize: space._13,
    backgroundImage: `linear-gradient(${color.muted}, transparent)`,
  },
});

export function HeaderFooterLayoutLab() {
  const page = labSource(
    <article css={article.base}>
      <Heading level={2}>
        {t({ en: "The quiet harbour", zh: "静谧的港湾" })}
      </Heading>
      <Text tone="muted">
        {t({
          en: "A reading page gets one centred measure and room to breathe. A back link on the left, utilities on the right, and nothing else competes with the text.",
          zh: "阅读页有一个居中的版心和充裕的留白。左侧是返回链接，右侧是实用控件，没有其他元素与正文争夺注意力。",
        })}
      </Text>
      <Text tone="muted">
        {t({
          en: "The background runs edge to edge beneath the content. Each floating group takes the pointer only on its own controls, so text stays selectable up to the top edge.",
          zh: "背景在内容下方满幅延展。每组悬浮控件只在控件本身上接收指针，因此文字直到顶部边缘都可以选中。",
        })}
      </Text>
      <Text tone="muted">
        {t({
          en: "The controls stay where they are while the page scrolls under them.",
          zh: "页面从控件下方滚过时，控件始终停在原处。",
        })}
      </Text>
      <Text tone="muted">
        {t({
          en: "The footer shares the width and the gutters of the column, so the page reads as one measure from the headline to the colophon.",
          zh: "页脚与内容列共享宽度和边距，从标题到版权信息整页保持同一版心。",
        })}
      </Text>
    </article>,
  );

  const headerStartSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "back",
      label: { en: "Back", zh: "返回" },
      value: labSource(
        <Button
          size="sm"
          look="ghost"
          icon={<ArrowLeftIcon weight="bold" />}
          aria-label={t({ en: "Back", zh: "返回" })}
        />,
      ),
    },
  ];

  const headerEndSamples: LabSample[] = [
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
            aria-label={t({ en: "Search", zh: "搜索" })}
          />
          <Button
            size="sm"
            look="ghost"
            icon={<GearSixIcon weight="bold" />}
            aria-label={t({ en: "Settings", zh: "设置" })}
          />
        </>,
      ),
    },
  ];

  const backgroundSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "wash",
      label: { en: "Wash", zh: "渐变" },
      value: labSource(<div css={wash.base} />),
    },
  ];

  const footerSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "colophon",
      label: { en: "Colophon", zh: "版权信息" },
      value: labSource(
        <footer>
          <Text as="p" look="caption" tone="muted">
            {t({ en: "Written by the harbour, 2026", zh: "写于港湾边，2026" })}
          </Text>
        </footer>,
      ),
    },
  ];

  const base = {
    as: "div",
    children: page,
  } as const;

  return (
    <LabCanvas
      config={{
        doc: headerFooterLayoutDoc,
        component: HeaderFooterLayout,
        scene: "page",
        variants: [
          {
            id: "reading",
            label: { en: "Reading page", zh: "阅读页" },
            props: {
              ...base,
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
              ...base,
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
              ...base,
              pageColumn: true,
              wideHeader: true,
              headerStart: "back",
              headerEnd: "utilities",
            },
          },
          {
            id: "plain",
            label: { en: "Content only", zh: "仅内容" },
            props: { ...base, pageColumn: true },
          },
        ],
        controls: [
          { prop: "headerStart", samples: headerStartSamples },
          { prop: "headerEnd", samples: headerEndSamples },
          { prop: "background", samples: backgroundSamples },
          { prop: "footer", samples: footerSamples },
          "pageColumn",
          "wideHeader",
          "contentMaxInlineSize",
        ],
      }}
    />
  );
}
