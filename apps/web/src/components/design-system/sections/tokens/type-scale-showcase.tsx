import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";
import { ContainerScaleDemo } from "./cq-scale-demo.tsx";
import { ViewportScaleDemo } from "./vp-scale-demo.tsx";

export function TypeScaleShowcase() {
  const pangram = t({
    en: "The quick brown fox jumps over the lazy dog.",
    zh: "敏捷的棕色狐狸跃过懒惰的狗。",
  });

  const staticSteps = [
    {
      token: "font.uiDisplay",
      meta: "3rem",
      size: styles.display,
      sample: t({ en: "Display", zh: "展示" }),
    },
    {
      token: "font.uiSubDisplay",
      meta: "2rem",
      size: styles.subDisplay,
      sample: t({ en: "Sub-display", zh: "副展示" }),
    },
    {
      token: "font.uiHeading1",
      meta: "1.5rem",
      size: styles.heading1,
      sample: t({ en: "Heading 1", zh: "标题 1" }),
    },
    {
      token: "font.uiHeading2",
      meta: "1.25rem",
      size: styles.heading2,
      sample: t({ en: "Heading 2", zh: "标题 2" }),
    },
    {
      token: "font.uiHeading3",
      meta: "1.1rem",
      size: styles.heading3,
      sample: t({ en: "Heading 3", zh: "标题 3" }),
    },
    { token: "font.uiBody", meta: "1rem", size: styles.body, sample: pangram },
    {
      token: "font.uiBodySmall",
      meta: "0.85rem",
      size: styles.bodySmall,
      sample: pangram,
    },
    {
      token: "font.uiCaption",
      meta: "0.75rem",
      size: styles.caption,
      sample: t({ en: "Caption text", zh: "说明文字" }),
    },
    {
      token: "font.uiOverline",
      meta: "0.7rem",
      size: styles.overline,
      sample: t({ en: "Overline label", zh: "上线标签" }),
    },
  ];

  return (
    <Showcase label={t({ en: "Type scale", zh: "字号" })}>
      <p css={styles.lead}>
        {t({
          en: "One scale in three modes — fixed, then fluid to the viewport, then fluid to the container.",
          zh: "同一字号的三种模式——固定、随视口流动、随容器流动。",
        })}
      </p>

      <Movement
        label={t({ en: "Static", zh: "固定字号" })}
        namespace="font.ui*"
        description={t({
          en: "Fixed rem sizes for dense UI — headings, body text, captions, and labels.",
          zh: "用于密集界面的固定字号——标题、正文、说明与标签。",
        })}
      >
        <ol css={styles.ledger}>
          {staticSteps.map((step, i) => (
            <ScaleRow
              key={step.token}
              index={i + 1}
              token={step.token}
              meta={step.meta}
              size={step.size}
              sample={step.sample}
            />
          ))}
        </ol>
      </Movement>

      <Movement
        label={t({ en: "Fluid · viewport", zh: "流式 · 视口" })}
        namespace="font.vp*"
        description={t({
          en: "Steps at the sm/md/lg breakpoints — headlines that grow with the canvas. The grid renders every step of all five vp tokens; the column matching your window is lit, and tracks as you resize. Display lurches base→lg while Heading 3 barely moves. This page's title is font.vpDisplay, live.",
          zh: "在 sm/md/lg 断点处分级——随画布扩展的标题。网格以真实尺寸呈现全部五个 vp 令牌的每一档；与当前窗口匹配的列会高亮，并随缩放跟随。Display 从 base 到 lg 大幅跃升，而 Heading 3 几乎不变。本页主标题即为 font.vpDisplay，正在实时演示。",
        })}
      >
        <ViewportScaleDemo />
      </Movement>

      <Movement
        label={t({ en: "Fluid · container", zh: "流式 · 容器" })}
        namespace="font.cq*"
        description={t({
          en: "Tracks its container's inline size, not the viewport. Each card below is a real fixed-width container — swipe the rail or drag the slider to compare, and the browser sizes each title between 1.1 and 1.4rem.",
          zh: "随容器行内尺寸变化，而非视口。下方每张卡片都是真实的定宽容器——滑动轨道或拖动滑块进行对比，浏览器会将每个标题在 1.1 至 1.4rem 之间取值。",
        })}
      >
        <ContainerScaleDemo />
      </Movement>
    </Showcase>
  );
}

interface MovementProps {
  label: string;
  namespace: string;
  description: string;
  children: ReactNode;
}

function Movement({ label, namespace, description, children }: MovementProps) {
  return (
    <section css={styles.movement}>
      <header css={styles.movementHeader}>
        <div css={styles.titleRow}>
          <h3 css={styles.movementLabel}>{label}</h3>
          <span css={styles.chip}>{namespace}</span>
        </div>
        <p css={styles.movementDesc}>{description}</p>
      </header>
      {children}
    </section>
  );
}

interface ScaleRowProps {
  index: number;
  token: string;
  meta: string;
  size: StyleXStyles;
  sample: ReactNode;
}

function ScaleRow({ index, token, meta, size, sample }: ScaleRowProps) {
  return (
    <li css={styles.row}>
      <span css={styles.index}>{String(index).padStart(2, "0")}</span>
      <div css={styles.meta}>
        <span css={styles.metaToken}>{token}</span>
        <span css={styles.metaSize}>{meta}</span>
      </div>
      <span css={[styles.specimen, size]}>{sample}</span>
    </li>
  );
}

const PANEL_BORDER = `inset 0 0 0 1px ${color.neutralBorder}`;

const styles = stylex.create({
  lead: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "62ch",
  },
  movement: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    paddingBlock: space._5,
    paddingInline: space._5,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: PANEL_BORDER,
  },
  movementHeader: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: space._3,
    rowGap: space._1,
  },
  movementLabel: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._00,
    paddingInline: space._2,
    borderRadius: border.radius_round,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: PANEL_BORDER,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  movementDesc: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "60ch",
  },
  ledger: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  row: {
    display: "grid",
    alignItems: "start",
    columnGap: space._4,
    rowGap: space._1,
    // Narrow: index spans both rows, meta over specimen. Wide (md+): the meta
    // moves into a fixed column beside the specimen so the rows read as a spec
    // sheet and the specimens align down the page.
    gridTemplateColumns: {
      default: "auto minmax(0, 1fr)",
      [breakpoints.md]: "auto minmax(8.5rem, 10rem) minmax(0, 1fr)",
    },
    gridTemplateAreas: {
      default: '"idx meta" "idx spec"',
      [breakpoints.md]: '"idx meta spec"',
    },
  },
  index: {
    gridArea: "idx",
    alignSelf: "start",
    minInlineSize: "2.25ch",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_5,
    fontVariantNumeric: "tabular-nums",
    color: color.textSubtle,
  },
  meta: {
    gridArea: "meta",
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  metaToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  metaSize: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    fontVariantNumeric: "tabular-nums",
  },
  specimen: {
    gridArea: "spec",
    minInlineSize: 0,
    overflowWrap: "break-word",
    color: color.textMain,
    lineHeight: font.lineHeight_1,
  },
  display: { fontSize: font.uiDisplay, fontWeight: font.weight_8 },
  subDisplay: { fontSize: font.uiSubDisplay, fontWeight: font.weight_8 },
  heading1: { fontSize: font.uiHeading1, fontWeight: font.weight_7 },
  heading2: { fontSize: font.uiHeading2, fontWeight: font.weight_7 },
  heading3: { fontSize: font.uiHeading3, fontWeight: font.weight_6 },
  body: {
    fontSize: font.uiBody,
    fontWeight: font.weight_4,
    lineHeight: font.lineHeight_4,
  },
  bodySmall: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_4,
    lineHeight: font.lineHeight_4,
  },
  caption: { fontSize: font.uiCaption, fontWeight: font.weight_5 },
  overline: {
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
  },
});
