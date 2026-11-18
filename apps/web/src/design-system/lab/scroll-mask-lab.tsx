"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollbar } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import scrollMaskDoc from "#src/_generated/props/scroll-mask.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
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
    backgroundColor: color.card,
  },
});

const rowRegion = stylex.create({
  base: {
    inlineSize: "24rem",
    maxInlineSize: "100%",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.card,
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
    backgroundColor: color.muted,
  },
});

const VERTICAL_CSS = labSource([corner.radius_3, region.base]);
const PADDED_CONTENT = labSource([
  stack.item,
  content.padded,
  scrollbar.autoHide,
]);

export function ScrollMaskLab() {
  const contentSamples: LabSample[] = [
    {
      id: "prose",
      label: { en: "Long text", zh: "长文本" },
      value: labSource(
        <>
          <Text look="bodySmall">
            {t({
              en: "Thirty years on, a new blade runner turns up a secret buried deep enough to unsettle what is left of the city.",
              zh: "三十年后，一名新的银翼杀手翻出了一个埋得足够深的秘密，足以动摇这座城市仅存的秩序。",
            })}
          </Text>
          <Text look="bodySmall">
            {t({
              en: "The trail leads to a former blade runner who dropped out of sight three decades ago.",
              zh: "线索指向一名三十年前销声匿迹的前银翼杀手。",
            })}
          </Text>
          <Text look="bodySmall">
            {t({
              en: "Every answer costs him something he was sure of when he started.",
              zh: "每找到一个答案，他出发时确信的东西就少一样。",
            })}
          </Text>
          <Text look="bodySmall">
            {t({
              en: "The rain does not stop, and the archives are gone.",
              zh: "雨一直没停，档案也已经没了。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "What he does with it is the one part no file records.",
              zh: "他如何处置这个秘密，是唯一没有记录在案的部分。",
            })}
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
            {t({
              en: "Denis Villeneuve, 2017. Roger Deakins shot it, and won for it.",
              zh: "丹尼斯·维伦纽瓦，2017 年。罗杰·迪金斯掌镜，并凭此获奖。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "163 minutes, and none of them hurried.",
              zh: "163 分钟，没有一分钟是赶出来的。",
            })}
          </Text>
        </>,
      ),
    },
    {
      id: "cards",
      label: { en: "A row of cards", zh: "一行卡片" },
      value: labSource(
        <>
          {[
            t({ en: "Blade Runner 2049", zh: "银翼杀手 2049" }),
            t({ en: "Arrival", zh: "降临" }),
            t({ en: "Dune", zh: "沙丘" }),
            t({ en: "Sicario", zh: "边境杀手" }),
            t({ en: "Prisoners", zh: "囚徒" }),
          ].map((title) => (
            <div key={title} css={[corner.radius_2, card.base]}>
              <Text look="bodySmall" weight="semibold">
                {title}
              </Text>
            </div>
          ))}
        </>,
      ),
    },
  ];

  const endChromeSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "bar",
      label: { en: "Action bar", zh: "操作栏" },
      value: labSource(
        <div css={chrome.bar}>
          <Button size="sm">{t({ en: "Save changes", zh: "保存更改" })}</Button>
        </div>,
      ),
    },
  ];

  const startChromeSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "header",
      label: { en: "Header row", zh: "标题行" },
      value: labSource(
        <div css={chrome.header}>
          <Text look="bodySmall" weight="semibold">
            {t({ en: "Synopsis", zh: "剧情简介" })}
          </Text>
        </div>,
      ),
    },
  ];

  const scrollButtonSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "labels",
      label: { en: "With labels", zh: "带名称" },
      value: {
        startLabel: t({ en: "Scroll back", zh: "往回滚动" }),
        endLabel: t({ en: "Scroll on", zh: "继续滚动" }),
      },
    },
  ];

  return (
    <LabCanvas
      config={{
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
              "aria-label": t({ en: "Films", zh: "影片" }),
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
          { prop: "children", samples: contentSamples },
          "orientation",
          { prop: "radius", range: { min: 0, max: 32 } },
          "depth",
          "startMask",
          { prop: "startChrome", samples: startChromeSamples },
          { prop: "endChrome", samples: endChromeSamples },
          { prop: "scrollButtons", samples: scrollButtonSamples },
          "clipMargin",
        ],
      }}
    />
  );
}
