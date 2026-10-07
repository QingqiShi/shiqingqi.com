import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { measure } from "#src/design-system/measure.stylex.ts";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { ContainerScaleSpecimen } from "./container-scale-specimen.tsx";
import { ViewportScaleSpecimen } from "./viewport-scale-specimen.tsx";

export function TypeScaleShowcase() {
  const pangram = t({
    en: "The quick brown fox jumps over the lazy dog.",
    zh: "敏捷的棕色狐狸跃过懒惰的狗。",
  });

  const staticSteps = [
    {
      token: "font.uiDisplay",
      meta: "3rem",
      use: 'Heading look="display"',
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
      use: 'Heading look="h1"',
      size: styles.heading1,
      sample: t({ en: "Heading 1", zh: "标题 1" }),
    },
    {
      token: "font.uiHeading2",
      meta: "1.25rem",
      use: 'Heading look="h2"',
      size: styles.heading2,
      sample: t({ en: "Heading 2", zh: "标题 2" }),
    },
    {
      token: "font.uiHeading3",
      meta: "1.1rem",
      use: 'Heading look="h3"',
      size: styles.heading3,
      sample: t({ en: "Heading 3", zh: "标题 3" }),
    },
    {
      token: "font.uiBody",
      meta: "1rem",
      use: 'Text look="body"',
      size: styles.body,
      sample: pangram,
    },
    {
      token: "font.uiBodySmall",
      meta: "0.85rem",
      use: 'Text look="bodySmall"',
      size: styles.bodySmall,
      sample: pangram,
    },
    {
      token: "font.uiCaption",
      meta: "0.75rem",
      use: 'Text look="caption"',
      size: styles.caption,
      sample: t({ en: "Caption text", zh: "说明文字" }),
    },
    {
      token: "font.uiOverline",
      meta: "0.7rem",
      use: 'Text look="overline"',
      size: styles.overline,
      sample: t({ en: "Overline label", zh: "上标签" }),
    },
    {
      token: "font.uiControl",
      meta: "1.2rem → 1rem ≥ md",
      size: styles.control,
      sample: t({ en: "Control label", zh: "控件标签" }),
    },
    {
      token: "font.uiControlCaption",
      meta: "0.9rem → 0.75rem ≥ md",
      size: styles.controlCaption,
      sample: t({ en: "Control caption", zh: "控件说明" }),
    },
  ];

  return (
    <GuideSection
      title={t({
        en: "Pick a scale by what the size follows",
        zh: "按字号要跟随什么来选字阶",
      })}
      lead={t({
        en: "The prefix says what a size follows: ui* follows nothing, vp* follows the viewport, and cq* follows a container. Every component uses ui*. vp* and cq* are for type of your own that should grow with the space it has.",
        zh: "前缀说明字号跟随什么：ui* 不跟随任何东西，vp* 跟随视口，cq* 跟随容器。所有组件都使用 ui*。vp* 与 cq* 用于你自建的、应随可用空间变大的文字。",
      })}
    >
      <Movement
        label={t({ en: "Static", zh: "固定" })}
        namespace="font.ui*"
        description={t({
          en: "Fixed sizes for everything inside an interface: headings, body, captions and labels. Text and Heading use these. uiControl and uiControlCaption are the two that change: they step down at md together with controlSize, so a label in uiControl fits a control sized with controlSize. Button, the fields, Checkbox and Switch set their labels in uiControl, and menu section titles use uiControlCaption.",
          zh: "固定的字号，用于界面内的一切：标题、正文、说明与标签。Text 与 Heading 用的就是这些。uiControl 与 uiControlCaption 是其中会变化的两个：它们与 controlSize 一起在 md 处变小，因此用 uiControl 的标签能与用 controlSize 设定尺寸的控件吻合。Button、各类输入框、Checkbox 与 Switch 的标签都用 uiControl，菜单分组标题用 uiControlCaption。",
        })}
        snippet={
          <UsageSnippet
            code={`import * as stylex from "@stylexjs/stylex";
import { controlSize, font } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  segment: {
    minBlockSize: controlSize._9,
    fontFamily: font.family,
    fontSize: font.uiControl,
    fontWeight: font.weight_5,
  },
});`}
          />
        }
      >
        <ol css={styles.ledger}>
          {staticSteps.map((step) => (
            <ScaleRow
              key={step.token}
              token={step.token}
              meta={step.meta}
              use={step.use}
              size={step.size}
              sample={step.sample}
            />
          ))}
        </ol>
      </Movement>

      <Movement
        label={t({ en: "Fluid to the viewport", zh: "随视口变化" })}
        namespace="font.vp*"
        description={t({
          en: "Steps up at sm, md and lg. For a title at the top of a landing page that should grow on a wide screen. No component uses these. The lit column below is the step your window is on, and it moves as you resize.",
          zh: "在 sm、md 与 lg 处逐级增大。用于落地页顶部、应在宽屏上变大的标题。没有任何组件使用它们。下方高亮的一列是你的窗口当前所在的档位，会随缩放移动。",
        })}
        snippet={
          <UsageSnippet
            code={`const styles = stylex.create({
  hero: { fontSize: font.vpDisplay },
});`}
          />
        }
      >
        <ViewportScaleSpecimen />
      </Movement>

      <Movement
        label={t({ en: "Fluid to a container", zh: "随容器变化" })}
        namespace="font.cq*"
        description={t({
          en: 'font.cqTitle follows the width of the container it sits in, for a title in a card that appears at many widths. Make the card a container with containerType "inline-size"; the title has to be inside it, because a container sizes what it holds, not itself. From lg up the token stops following and sets at 1.5rem. It measures with cqmin, and an inline-size container has no height to give, so on a short, wide screen the viewport\'s height can cap it.',
          zh: 'font.cqTitle 跟随其所在容器的宽度，用于会以多种宽度出现的卡片里的标题。用 containerType "inline-size" 把卡片设为容器；标题必须在容器内部，因为容器决定的是它所包含内容的尺寸，而不是它自己的。从 lg 起，这个令牌不再跟随容器，固定为 1.5rem。它以 cqmin 计算，而 inline-size 容器不提供高度，因此在又矮又宽的屏幕上，视口高度可能会限制它。',
        })}
        snippet={
          <UsageSnippet
            code={`const styles = stylex.create({
  card: { containerType: "inline-size" },
  title: { fontSize: font.cqTitle },
});

<article css={styles.card}>
  <h3 css={styles.title}>Kyoto in four days</h3>
</article>`}
          />
        }
      >
        <ContainerScaleSpecimen />
      </Movement>
      <GuideNote>
        {t({
          en: "Every size is in rem, so it grows with the font size the reader sets in the browser. A px font-size on the root element fixes all of them; leave it unset, or give it in %.",
          zh: "所有字号都以 rem 为单位，因此会随读者在浏览器中设置的字号变大。在根元素上用 px 设定 font-size 会把它们全部固定；请不要设置，或用 % 设置。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

interface MovementProps {
  label: string;
  namespace: string;
  description: string;
  snippet: ReactNode;
  children: ReactNode;
}

function Movement({
  label,
  namespace,
  description,
  snippet,
  children,
}: MovementProps) {
  return (
    <section css={styles.movementWrap}>
      <div css={[corner.radius_3, styles.movement]}>
        <header css={styles.movementHeader}>
          <div css={styles.titleRow}>
            <Heading level={3}>{label}</Heading>
            <span css={[corner.radius_round, styles.chip]}>{namespace}</span>
          </div>
          <p css={styles.movementDesc}>{description}</p>
        </header>
        {children}
      </div>
      {snippet}
    </section>
  );
}

interface ScaleRowProps {
  token: string;
  meta: string;
  /** The component look that sets this step, when one does. */
  use?: string;
  size: StyleXStyles;
  sample: ReactNode;
}

function ScaleRow({ token, meta, use, size, sample }: ScaleRowProps) {
  return (
    <li css={styles.row}>
      <div css={styles.meta}>
        <span css={styles.metaToken}>
          <Identifier>{token}</Identifier>
        </span>
        <span css={styles.metaDetail}>{meta}</span>
        {use ? <span css={styles.metaDetail}>{use}</span> : null}
      </div>
      <span css={[styles.specimen, size]}>{sample}</span>
    </li>
  );
}

const PANEL_BORDER = `inset 0 0 0 1px ${color.border}`;

const styles = stylex.create({
  movementWrap: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  movement: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    paddingBlock: space._5,
    paddingInline: space._5,
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
  chip: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._00,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: PANEL_BORDER,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.fgMuted,
  },
  movementDesc: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.fgMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
  ledger: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  // Narrow: meta over specimen. Wide (md+): the meta moves into a fixed
  // column, so the specimens align down the ledger.
  row: {
    display: "grid",
    alignItems: "start",
    columnGap: space._4,
    rowGap: space._1,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "minmax(10rem, 12rem) minmax(0, 1fr)",
    },
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  metaToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.fg,
  },
  metaDetail: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.fgMuted,
    fontVariantNumeric: "tabular-nums",
  },
  specimen: {
    minInlineSize: 0,
    maxInlineSize: measure.prose,
    overflowWrap: "break-word",
    color: color.fg,
    lineHeight: font.lineHeight_1,
  },
  display: { fontSize: font.uiDisplay, fontWeight: font.weight_8 },
  subDisplay: { fontSize: font.uiSubDisplay, fontWeight: font.weight_8 },
  heading1: { fontSize: font.uiHeading1, fontWeight: font.weight_8 },
  heading2: { fontSize: font.uiHeading2, fontWeight: font.weight_7 },
  heading3: { fontSize: font.uiHeading3, fontWeight: font.weight_7 },
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
  caption: { fontSize: font.uiCaption, lineHeight: font.lineHeight_3 },
  overline: {
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
  },
  control: { fontSize: font.uiControl, fontWeight: font.weight_5 },
  controlCaption: {
    fontSize: font.uiControlCaption,
    color: color.fgMuted,
  },
});
