import * as stylex from "@stylexjs/stylex";
import { Card } from "@tuja/ui/components/card";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, rhythm, shadow, space } from "@tuja/ui/tokens.stylex";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function SurfacesShowcase() {
  const skins = [
    {
      term: "cardSurface.base",
      value: "@tuja/ui/components/card.stylex",
      note: t({
        en: "What Card paints: a border.size_1 edge in color.border, color.bgSurface, and corner radius_3. It has no padding: add space._3 on the block axis and space._4 on the inline axis to match a Card.",
        zh: "Card 所画的表面：color.border 颜色的 border.size_1 边框、color.bgSurface，以及 radius_3 圆角。它不带内边距：块向加 space._3、行向加 space._4，就与 Card 一致。",
      }),
    },
    {
      term: "cardSurface.interactive",
      value: "@tuja/ui/components/card.stylex",
      note: t({
        en: "Add it to a card that is a link or a button. It sets the pointer cursor, an accent edge and a control fill on hover, and a focus ring drawn inside the edge, so overflow: hidden on the card does not clip it.",
        zh: "用在本身就是链接或按钮的卡片上。它设置指针光标、悬停时的强调色边框与控件填充，以及画在边框内侧的焦点环，卡片设了 overflow: hidden 也不会把它裁掉。",
      }),
    },
    {
      term: "popoverSurface.base",
      value: "@tuja/ui/components/popover-surface.stylex",
      note: t({
        en: "What Popover and MenuButton's menu paint: color.bgSurfaceRaised, a border.size_1 edge and radius_2. It leaves padding and clipping to you, and casts no shadow.",
        zh: "Popover 与 MenuButton 菜单所画的表面：color.bgSurfaceRaised、border.size_1 边框与 radius_2 圆角。内边距与裁剪留给你，它也不投阴影。",
      }),
    },
  ];

  const widths = [
    {
      token: "border.size_1",
      px: "1px",
      swatch: styles.w1,
      use: t({
        en: "Every edge: Card, Popover, the fields, table rows, Callout, Section and Divider",
        zh: "所有边框：Card、Popover、输入框、表格行、Callout、Section 与 Divider",
      }),
    },
    {
      token: "border.size_2",
      px: "2px",
      swatch: styles.w2,
      use: t({
        en: "Focus rings, the edge of a Checkbox and a Slider thumb, and a bold Divider",
        zh: "焦点环、Checkbox 与 Slider 滑块的边框，以及加粗的 Divider",
      }),
    },
    {
      token: "border.size_3",
      px: "5px",
      swatch: styles.w3,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
    {
      token: "border.size_4",
      px: "10px",
      swatch: styles.w4,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
    {
      token: "border.size_5",
      px: "25px",
      swatch: styles.w5,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
  ];

  const radii = [
    {
      token: "corner.radius_1",
      meta: ".3rem",
      swatch: radiusStyles.r1,
      use: t({
        en: "Checkbox, a Breadcrumb link, Callout's dismiss button",
        zh: "Checkbox、Breadcrumb 链接、Callout 的关闭按钮",
      }),
    },
    {
      token: "corner.radius_2",
      meta: ".5rem",
      swatch: radiusStyles.r2,
      use: t({
        en: "The fields, Popover, Table, CodeBlock, Skeleton, Disclosure",
        zh: "输入框、Popover、Table、CodeBlock、Skeleton、Disclosure",
      }),
    },
    {
      token: "corner.radius_3",
      meta: "1rem",
      swatch: radiusStyles.r3,
      use: t({
        en: "Card, Callout, and SidebarLayout's rail from md up",
        zh: "Card、Callout，以及 md 及以上 SidebarLayout 的侧栏",
      }),
    },
    {
      token: "corner.radius_4",
      meta: "2rem",
      swatch: radiusStyles.r4,
      use: t({ en: "Overlay", zh: "Overlay" }),
    },
    {
      token: "corner.radius_5",
      meta: "3rem",
      swatch: radiusStyles.r5,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
    {
      token: "corner.squircle_round",
      meta: t({
        en: "half of cornerTokens.height",
        zh: "cornerTokens.height 的一半",
      }),
      swatch: radiusStyles.rSquircleRound,
      use: t({
        en: "Button, AnchorButton, SegmentedControl",
        zh: "Button、AnchorButton、SegmentedControl",
      }),
    },
    {
      token: "corner.radius_round",
      meta: t({ en: "circular caps", zh: "圆弧端帽" }),
      swatch: radiusStyles.rRound,
      use: t({
        en: "A pill or a circle: Chip, Switch, Slider, Avatar, Progress",
        zh: "胶囊或圆形：Chip、Switch、Slider、Avatar、Progress",
      }),
    },
  ];

  const shadows = [
    {
      token: "shadow._1",
      swatch: shadowStyles.s1,
      use: t({ en: "Avatar", zh: "Avatar" }),
    },
    {
      token: "shadow._2",
      swatch: shadowStyles.s2,
      use: t({
        en: "Button's filled looks, the Switch track, the Slider thumb, glassSurface, SidebarLayout's mobile bar",
        zh: "Button 的实心外观、Switch 轨道、Slider 滑块、glassSurface、SidebarLayout 的移动端底栏",
      }),
    },
    {
      token: "shadow._3",
      swatch: shadowStyles.s3,
      use: t({ en: "The Switch thumb on hover", zh: "悬停时的 Switch 滑块" }),
    },
    {
      token: "shadow._4",
      swatch: shadowStyles.s4,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
    {
      token: "shadow._5",
      swatch: shadowStyles.s5,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
    {
      token: "shadow._6",
      swatch: shadowStyles.s6,
      use: t({
        en: "SidebarLayout's drawer below md, where it covers the page",
        zh: "md 以下 SidebarLayout 的抽屉，此时它盖住页面",
      }),
    },
    {
      token: "shadow.inset",
      swatch: shadowStyles.inset,
      use: t({ en: "No component uses it", zh: "没有组件使用" }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Start from a skin", zh: "从现成的外观开始" })}
        lead={t({
          en: "Two style objects paint the surfaces the components use. Compose one onto your own element when it has to look like a Card or a popover, but Card itself does not fit: a link, a list item, a menu you build.",
          zh: "有两个样式对象画出组件所用的表面。当你自己的元素必须看起来像 Card 或弹出层、而 Card 本身又用不上时——链接、列表项、自己搭的菜单——把其中一个组合上去。",
        })}
      >
        <SpecimenGrid>
          <Specimen
            caption={t({
              en: "cardSurface, through Card",
              zh: "cardSurface，经由 Card",
            })}
          >
            <Card css={[stack.tight, styles.card]}>
              <Text look="bodySmall" weight="semibold">
                {t({ en: "Watchlist", zh: "待看清单" })}
              </Text>
              <Text look="caption" tone="muted">
                {t({ en: "12 titles", zh: "12 部" })}
              </Text>
            </Card>
          </Specimen>
          <Specimen
            caption={t({
              en: "popoverSurface on a list you build",
              zh: "你自己搭的列表上的 popoverSurface",
            })}
          >
            <ul css={[popoverSurface.base, styles.menu]}>
              <li css={[typeRole.label, corner.radius_1, styles.row]}>
                {t({ en: "Newest first", zh: "最新的在前" })}
              </li>
              <li
                aria-current="true"
                css={[
                  typeRole.label,
                  corner.radius_1,
                  styles.row,
                  styles.rowSelected,
                ]}
              >
                {t({ en: "Highest rated", zh: "评分最高" })}
              </li>
              <li css={[typeRole.label, corner.radius_1, styles.row]}>
                {t({ en: "A to Z", zh: "按名称" })}
              </li>
            </ul>
          </Specimen>
        </SpecimenGrid>
        <GuideList items={skins} />
        <UsageSnippet
          code={`import { cardSurface } from "@tuja/ui/components/card.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";

// Link is not a host element, so spread the compiled props.
<Link
  href="/watchlist"
  {...stylex.props(cardSurface.base, cardSurface.interactive, styles.card)}
/>

const styles = stylex.create({
  card: { paddingBlock: space._3, paddingInline: space._4 },
});`}
        />
      </GuideSection>

      <GuideSection
        title={t({ en: "Border width", zh: "描边粗细" })}
        lead={t({
          en: "To draw an edge yourself, use border.size_1 in color.border, as every component edge does. border.size_2 is for focus rings and for a few control parts.",
          zh: "自己画边框时，用 color.border 颜色的 border.size_1，组件的每条边框都是这样。border.size_2 用于焦点环和少数控件部件。",
        })}
      >
        <UsageSnippet
          code={`import { border, color } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  panel: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
});`}
        />
        <div css={styles.grid}>
          {widths.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.px}>
              <div css={[corner.radius_2, styles.widthSwatch, step.swatch]} />
              <Text look="caption" tone="muted">
                {step.use}
              </Text>
            </SpecCard>
          ))}
        </div>
        <GuideNote>
          {t({
            en: "Which background and border colour a surface takes is on ",
            zh: "表面该用哪种背景色与边框色，见",
          })}
          <DocLink path="/design-system/foundations/color" />
          {t({ en: ".", zh: "。" })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Corner radius", zh: "圆角" })}
        lead={t({
          en: "Round a corner with the corner Primitive. Each member sets a radius and the corner shape that goes with it: a squircle for radius_1 to radius_5, circular caps for radius_round. Pick the step of the component your surface sits beside.",
          zh: "用 corner 原语做圆角。每个成员同时设定圆角半径与对应的角形：radius_1 到 radius_5 是超椭圆角，radius_round 是圆弧端帽。选择与你的表面相邻的组件所用的那一级。",
        })}
      >
        <UsageSnippet
          code={`import { corner, cornerTokens } from "@tuja/ui/primitives/corner.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";

<article css={[corner.radius_3, styles.card]} />
<span css={corner.radius_round} />
<button css={[corner.squircle_round, styles.control]} />

const styles = stylex.create({
  // squircle_round closes at half this height. The default is controlSize._9.
  control: {
    [cornerTokens.height]: controlSize._8,
    minBlockSize: cornerTokens.height,
  },
});`}
        />
        <div css={styles.grid}>
          {radii.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.meta}>
              <div css={[styles.radiusSwatch, step.swatch]} />
              <Text look="caption" tone="muted">
                {step.use}
              </Text>
            </SpecCard>
          ))}
        </div>
        <GuideList
          items={[
            {
              term: t({
                en: "Without corner-shape",
                zh: "不支持 corner-shape 时",
              }),
              note: t({
                en: "A browser without corner-shape draws a circular arc. There, border.radius_1 to radius_5 fall back to 0.6 of their value, so the corner cuts about the same area. squircle_round falls back to 0.3 of cornerTokens.height, so a Button stays a rounded rectangle and does not turn into a pill.",
                zh: "不支持 corner-shape 的浏览器画的是圆弧。在这种浏览器里，border.radius_1 到 radius_5 回退为原值的 0.6，角切掉的面积大致相同。squircle_round 回退为 cornerTokens.height 的 0.3，Button 因此仍是圆角矩形，不会变成胶囊。",
              }),
            },
            {
              term: t({
                en: "A radius the Primitive cannot set",
                zh: "原语设不了的圆角",
              }),
              note: t({
                en: 'For a pseudo-element, a single corner or a calculated radius, write borderRadius from border.radius_* and put cornerShape: "squircle" beside it in the same style. Without it the corner is a circular arc at the full value, which is larger than the other corners.',
                zh: '伪元素、单个角或计算出的圆角，用 border.radius_* 写 borderRadius，并在同一个样式里把 cornerShape: "squircle" 写在旁边。少了它，角就是按完整数值画的圆弧，比其他角更大。',
              }),
            },
          ]}
        />
      </GuideSection>

      <GuideSection
        title={t({ en: "Nested radius", zh: "嵌套圆角" })}
        lead={t({
          en: "A surface inside another one's corner takes the outer radius less the inset between their edges: inner = outer − inset. Then the two corners stay parallel.",
          zh: "位于另一个表面角落里的表面，圆角取外层圆角减去两者边缘之间的内缩：inner = outer − inset。这样两个角保持平行。",
        })}
      >
        <Specimen
          caption={t({
            en: "corner.radius_4 outside, inset space._2, radius_4 − space._2 inside",
            zh: "外层 corner.radius_4，内缩 space._2，内层 radius_4 − space._2",
          })}
        >
          <div css={[corner.radius_4, styles.outer]}>
            <div css={[flex.center, styles.inner]}>
              <Text look="caption" tone="muted">
                {t({ en: "Nested surface", zh: "嵌套表面" })}
              </Text>
            </div>
          </div>
        </Specimen>
        <UsageSnippet
          code={`import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, space } from "@tuja/ui/tokens.stylex";

<div css={[corner.radius_4, styles.outer]}>
  <div css={styles.inner} />
</div>

const styles = stylex.create({
  outer: { padding: space._2 },
  // inner = outer − inset
  inner: {
    borderRadius: \`calc(\${border.radius_4} - \${space._2})\`,
    cornerShape: "squircle",
  },
});`}
        />
        <GuideNote>
          {t({
            en: "popoverSurface.inner is this rule for a box flush with a popover's edge, such as a scrolling content area, where the inset is the border. MenuButton puts it on its menu's content.",
            zh: "popoverSurface.inner 就是这条规则，用于紧贴弹出层边缘的盒子，比如可滚动的内容区，此时内缩就是边框宽度。MenuButton 把它用在菜单内容上。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Shadow", zh: "阴影" })}
        lead={t({
          en: "Card, Popover, Callout and Table cast no shadow: they hold content, and a border and a background set them apart. Shadows are on things that sit on top of what is below them: a Button you press, a thumb you drag, glass, a drawer over the page. Follow the same split.",
          zh: "Card、Popover、Callout 与 Table 不投阴影：它们承载内容，靠边框与背景来区分。阴影用在压在下方之上的东西上：按下的 Button、拖动的滑块、玻璃、盖在页面上的抽屉。照同样的方式划分。",
        })}
      >
        <UsageSnippet
          code={`import { shadow } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  handle: { boxShadow: shadow._2 },
});`}
        />
        <div css={styles.grid}>
          {shadows.map((step) => (
            <SpecCard key={step.token} token={step.token} meta="">
              <div css={styles.shadowFloor}>
                <div
                  css={[corner.radius_2, styles.shadowSwatch, step.swatch]}
                />
              </div>
              <Text look="caption" tone="muted">
                {step.use}
              </Text>
            </SpecCard>
          ))}
        </div>
        <GuideNote>
          {t({
            en: "Each shadow is a light-dark() pair like the colour Tokens: a faint grey in light, a deep near-black in dark, where a shadow has to be darker to show on a dark ground.",
            zh: "每个阴影都像颜色令牌一样是一对 light-dark() 值：浅色下是淡灰，深色下是接近黑的深色，因为在深色底上阴影必须更深才看得见。",
          })}
        </GuideNote>
      </GuideSection>
    </>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: rhythm.item,
  },
  card: {
    inlineSize: "100%",
    maxInlineSize: "16rem",
  },
  menu: {
    listStyle: "none",
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
    padding: space._0,
    inlineSize: "100%",
    maxInlineSize: "16rem",
  },
  row: {
    paddingBlock: space._1,
    paddingInline: space._2,
    color: color.fg,
  },
  rowSelected: {
    backgroundColor: color.bgControlSelected,
  },
  // Border-width specimen: a real border at the token thickness, in the default
  // border colour, on a surface fill so the rule reads against its ground.
  widthSwatch: {
    blockSize: "56px",
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  w1: { borderWidth: border.size_1 },
  w2: { borderWidth: border.size_2 },
  w3: { borderWidth: border.size_3 },
  w4: { borderWidth: border.size_4 },
  w5: { borderWidth: border.size_5 },
  radiusSwatch: {
    blockSize: "80px",
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  // The fallback of squircle_round uses cornerTokens.height. Thus the swatch
  // must have this height.
  squircleSwatch: {
    blockSize: cornerTokens.height,
  },
  // Do not add a border to the outer surface. A border increases the inset.
  outer: {
    inlineSize: "100%",
    maxInlineSize: "18rem",
    padding: space._2,
    backgroundColor: color.bgSurfaceSunken,
  },
  inner: {
    blockSize: "96px",
    borderRadius: `calc(${border.radius_4} - ${space._2})`,
    cornerShape: "squircle",
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  shadowFloor: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: space._5,
    backgroundColor: color.bgCanvas,
  },
  shadowSwatch: {
    inlineSize: "64px",
    blockSize: "40px",
    backgroundColor: color.bgSurface,
  },
});

const radiusStyles = {
  r1: corner.radius_1,
  r2: corner.radius_2,
  r3: corner.radius_3,
  r4: corner.radius_4,
  r5: corner.radius_5,
  rRound: corner.radius_round,
  rSquircleRound: [corner.squircle_round, styles.squircleSwatch],
};

const shadowStyles = stylex.create({
  s1: { boxShadow: shadow._1 },
  s2: { boxShadow: shadow._2 },
  s3: { boxShadow: shadow._3 },
  s4: { boxShadow: shadow._4 },
  s5: { boxShadow: shadow._5 },
  s6: { boxShadow: shadow._6 },
  inset: { boxShadow: shadow.inset },
});
