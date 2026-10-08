import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  font,
  layer,
  measure,
  ratio,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { LayoutBreakpointBands } from "./layout-breakpoint-bands.tsx";

export function LayoutShowcase() {
  const layers = [
    { name: "background", value: "-100", z: styles.lzBackground },
    { name: "base", value: "0", z: styles.lzBase },
    { name: "content", value: "100", z: styles.lzContent },
    { name: "effect", value: "125", z: styles.lzEffect },
    { name: "blur", value: "150", z: styles.lzBlur },
    { name: "raised", value: "200", z: styles.lzRaised },
    { name: "header", value: "300", z: styles.lzHeader },
    { name: "overlay", value: "400", z: styles.lzOverlay },
    { name: "tooltip", value: "500", z: styles.lzTooltip },
    { name: "toaster", value: "600", z: styles.lzToaster },
  ];
  const layerGuide = [
    {
      term: "layer.raised",
      note: t({
        en: "Above the content, under the header, so it scrolls away beneath the header. MenuButton's menu and StickyControls use it. Use it for your own sticky bar, or a menu that opens in the page.",
        zh: "高于内容、低于页头，因此会从页头下方滚走。MenuButton 的菜单与 StickyControls 位于这一层。你自己的吸顶栏，或在页面中展开的菜单，用这一层。",
      }),
    },
    {
      term: "layer.header",
      note: t({
        en: "Page chrome: HeaderFooterLayout's floating header controls, and SidebarLayout's rail and mobile bar.",
        zh: "页面框架：HeaderFooterLayout 的悬浮页头控件，以及 SidebarLayout 的侧栏与移动端底栏。",
      }),
    },
    {
      term: "layer.overlay",
      note: t({
        en: "A surface that owns the viewport while it is open, above the chrome: Overlay, and SidebarLayout's drawer below md.",
        zh: "打开期间占据整个视口、压在框架之上的表面：Overlay，以及 SidebarLayout 在 md 以下的抽屉。",
      }),
    },
    {
      term: "layer.tooltip",
      note: t({
        en: "Above an open overlay. Popover renders into document.body at this plane, so it shows over an Overlay that holds its trigger.",
        zh: "高于打开的覆盖层。Popover 渲染到 document.body，位于这一层，所以当它的触发元素在 Overlay 里时，它也显示在 Overlay 之上。",
      }),
    },
    {
      term: "layer.toaster",
      note: t({
        en: "The top plane. No component uses it, so it is free for your toasts.",
        zh: "最高的一层。没有组件使用它，留给你的提示条。",
      }),
    },
  ];
  const measures = [
    {
      term: "measure.prose",
      value: "41em",
      note: t({
        en: "Running prose: a paragraph, a lead, a note. 41 Chinese characters at any size, around 88 Latin.",
        zh: "连续的正文：段落、导语、说明。任何字号下都是 41 个汉字，约 88 个拉丁字符。",
      }),
    },
    {
      term: "measure.short",
      value: "24em",
      note: t({
        en: "A short block that stands alone: a lede under a title, an empty state, a hint, the text in a popover. It stays compact, so it reads as one unit.",
        zh: "独立的短文本块：标题下的引言、空状态、提示、弹出层里的文字。它保持紧凑，读起来是一个整体。",
      }),
    },
  ];
  const ratios = [
    { token: "ratio.square", meta: "1", swatch: styles.arSquare },
    { token: "ratio.golden", meta: "1.618/1", swatch: styles.arGolden },
    { token: "ratio.tv", meta: "4/3", swatch: styles.arTv },
    { token: "ratio.double", meta: "2/1", swatch: styles.arDouble },
    { token: "ratio.wide", meta: "16/9", swatch: styles.arWide },
    { token: "ratio.poster", meta: "2/3", swatch: styles.arPoster },
    { token: "ratio.portrait", meta: "3/4", swatch: styles.arPortrait },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Breakpoints", zh: "断点" })}
        lead={t({
          en: "Each breakpoint is a min-width media query that you use as a key inside a style. Write the value for the narrowest screen as the default, then override it as the screen widens.",
          zh: "每个断点都是一个最小宽度媒体查询，在样式里用作键。把最窄屏幕的值写成默认值，再随屏幕变宽逐级覆盖。",
        })}
      >
        <LayoutBreakpointBands />
        <UsageSnippet
          code={`import { breakpoints } from "@tuja/ui/breakpoints.stylex";

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "1fr 1fr",
      [breakpoints.lg]: "repeat(3, 1fr)",
    },
  },
});`}
        />
        <GuideNote>
          {t({
            en: "The components change at md and at no other breakpoint: controlSize and font.uiControl step down, SidebarLayout moves its rail beside the content, Overlay moves its close button, and a Button with hideLabelOnMobile shows its label. Make your own main layout change at md too, so the page changes in one step.",
            zh: "组件只在 md 处变化，不在其他断点变化：controlSize 与 font.uiControl 缩小一级，SidebarLayout 把侧栏移到内容旁边，Overlay 移动它的关闭按钮，启用 hideLabelOnMobile 的 Button 显示出标签。你自己的主要布局变化也放在 md，页面就在同一步里一起变化。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "A breakpoint key compiles to a media query only through the stylex-breakpoints Babel plugin, which ",
            zh: "断点键只有经过 stylex-breakpoints Babel 插件才会编译成媒体查询，配置方法见",
          })}
          <DocLink path="/design-system/foundations/get-started" />
          {t({ en: " sets up.", zh: "。" })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Page column", zh: "页面栏" })}
        lead={t({
          en: "The page column is where a page's content sits: centred, at most 1140px wide with its gutters, and never closer to the screen edge than the page gutter, which includes the safe area. HeaderFooterLayout with pageColumn sets its content there, and its header controls and footer are on the same edges.",
          zh: "页面栏是页面内容所在的位置：居中，连同边距最宽 1140px，离屏幕边缘至少一个页面边距，页面边距包含安全区域。启用 pageColumn 的 HeaderFooterLayout 把内容放在这里，它的页头控件和页脚也在同样的边缘上。",
        })}
      >
        <div css={[corner.radius_2, styles.viewport]} aria-hidden="true">
          <span css={[typeRole.caption, styles.gutterLabel]}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
          <div css={[corner.radius_1, styles.contentBand]}>
            <span css={[typeRole.label, styles.contentLabel]}>
              {t({ en: "content", zh: "内容" })}
            </span>
            <span css={[typeRole.caption, styles.contentToken]}>
              pageColumn.base
            </span>
          </div>
          <span css={[typeRole.caption, styles.gutterLabel]}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
        </div>
        <UsageSnippet
          code={`import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";

// The band spans the page, so its background bleeds.
// Its content sits in the page column.
<section css={[pageColumn.base, styles.band]}>{children}</section>

// Cards that scroll sideways rest on the column
// and scroll out to the screen edges.
<div css={[pageColumn.scroller, scrollX.base]}>{cards}</div>`}
        />
        <GuideNote>
          {t({
            en: "The page column is padding, not a capped box, so put it on a box that spans the page. For one gutter, take pageGutter.inlineStart or pageGutter.inlineEnd: a control fixed at the screen edge, or a bar that steps out of the column by one gutter.",
            zh: "页面栏是内边距，不是限宽的盒子，所以把它放在横跨整个页面的盒子上。只需要一个边距时，取 pageGutter.inlineStart 或 pageGutter.inlineEnd：固定在屏幕边缘的控件，或比页面栏多伸出一个边距的栏。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "layout.maxInlineSize is only the width of the column. Outside @tuja/ui, the require-page-column lint rule refuses it, and refuses a left or right safe-area inset, so every page lines up on the same edge. For a narrower page, HeaderFooterLayout and SidebarLayout take contentMaxInlineSize.",
            zh: "layout.maxInlineSize 只是页面栏的宽度。在 @tuja/ui 之外，require-page-column 检查规则会拒绝它，也会拒绝左右两侧的安全区域，所以每个页面都对齐同一条边。要让页面更窄，HeaderFooterLayout 与 SidebarLayout 都接受 contentMaxInlineSize。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Measure", zh: "行长" })}
        lead={t({
          en: "The Measure caps the length of a line of prose, so the eye finds the next line. It is in em, so a larger text size gets a wider cap and keeps the same number of characters.",
          zh: "行长限制一行正文的长度，让视线能找到下一行。它以 em 为单位，所以字号越大上限越宽，每行的字数不变。",
        })}
      >
        <div css={[typeRole.body, stack.item]} aria-hidden="true">
          {measures.map((step) => (
            <div key={step.term} css={stack.tight}>
              <span css={[typeRole.caption, styles.contentToken]}>
                {step.term}
              </span>
              <span
                css={[
                  corner.radius_1,
                  styles.measureBar,
                  step.term === "measure.prose"
                    ? styles.measureProse
                    : styles.measureShort,
                ]}
              />
            </div>
          ))}
        </div>
        <GuideList items={measures} />
        <UsageSnippet
          code={`import { Text } from "@tuja/ui/components/text";
import { measure } from "@tuja/ui/tokens.stylex";

// A paragraph already stops at measure.prose.
<Text>{overview}</Text>

const styles = stylex.create({
  emptyState: { maxInlineSize: measure.short, marginInline: "auto" },
});`}
        />
        <GuideNote>
          {t({
            en: 'Text caps itself at measure.prose when it renders a paragraph: as="p" at body or bodySmall. A span, a div, a caption and an overline are not capped, so a label in a row or a table cell keeps its width. To let a paragraph run the full width, pass css with maxInlineSize: "none".',
            zh: 'Text 渲染段落时（body 或 bodySmall 字号的 as="p"）会把自己限制在 measure.prose。span、div、caption 与 overline 不受限制，所以行内或表格单元格里的标签保持原有宽度。要让段落占满整个宽度，传入带 maxInlineSize: "none" 的 css。',
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The Measure caps a line; the page column places the page. A cap in ch is a line length picked by hand, so the require-measure lint rule refuses one.",
            zh: "行长限制的是一行，页面栏安放的是页面。以 ch 写的上限是手选的行长，所以 require-measure 检查规则会拒绝它。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Layers", zh: "层级" })}
        lead={t({
          en: "Take a z-index from layer, never a number. The planes are a hundred apart, so the order between your surfaces and the components' is set by the name you pick.",
          zh: "z-index 从 layer 取，绝不写数字。各层相隔一百，你的表面与组件之间的先后顺序，由你选的名字决定。",
        })}
      >
        <ScrollMask
          orientation="horizontal"
          css={styles.layerScroll}
          contentCss={[scrollX.base, styles.layerScroller]}
        >
          <div css={styles.layerStack}>
            {layers.map((plane, index) => (
              <div
                key={plane.name}
                css={[
                  corner.radius_2,
                  styles.layerCard,
                  plane.z,
                  styles.layerOffset(index),
                ]}
              >
                <span css={[typeRole.bodySmall, styles.layerName]}>
                  layer.{plane.name}
                </span>
                <span
                  css={[
                    typeRole.caption,
                    typeModifier.numeric,
                    styles.layerValue,
                  ]}
                >
                  {plane.value}
                </span>
              </div>
            ))}
          </div>
        </ScrollMask>
        <GuideList items={layerGuide} />
        <UsageSnippet
          code={`import { layer } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  // On the bar's outermost element.
  filterBar: { position: "sticky", insetBlockStart: 0, zIndex: layer.raised },
});`}
        />
        <GuideNote>
          {t({
            en: "A z-index only orders siblings inside one stacking context. position: fixed, position: sticky and isolation: isolate each open one, and a child's z-index never gets out of it. Put the plane on the outermost element of the surface, or it cannot rise above the components' planes.",
            zh: "z-index 只在同一个层叠上下文里为兄弟元素排序。position: fixed、position: sticky 与 isolation: isolate 都会开启一个层叠上下文，子元素的 z-index 永远出不去。把层级放在表面最外层的元素上，否则它无法压过组件所在的层。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The planes below raised belong to the system: content holds the page in HeaderFooterLayout, effect holds the effect layer's canvases, and blur holds the page's Progressive blurs.",
            zh: "raised 以下的各层属于系统：content 承载 HeaderFooterLayout 里的页面，effect 承载效果层的画布，blur 承载页面的渐进虚化。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Aspect ratios", zh: "宽高比" })}
        lead={t({
          en: "Give a media frame an aspectRatio from ratio, so the frame holds its shape while the image loads.",
          zh: "给媒体框一个取自 ratio 的 aspectRatio，图片加载时框也能保持形状。",
        })}
      >
        <UsageSnippet
          code={`import { ratio } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  poster: { aspectRatio: ratio.poster, inlineSize: "100%" },
});`}
        />
        <div css={styles.grid}>
          {ratios.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.meta}>
              <div css={styles.ratioFloor}>
                <span
                  css={[corner.radius_1, styles.ratioSwatch, step.swatch]}
                />
              </div>
            </SpecCard>
          ))}
        </div>
      </GuideSection>
    </>
  );
}

const styles = stylex.create({
  // Page column schematic: a full-width "viewport" with a centred content band
  // and labelled gutters. Illustrative — the true cap is 1140px.
  viewport: {
    display: "flex",
    alignItems: "stretch",
    gap: rhythm.tight,
    padding: space._1,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  gutterLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._8,
    flexShrink: 0,
    fontFamily: font.familyMono,
    color: color.fgMuted,
    textAlign: "center",
  },
  contentBand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.tight,
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._5,
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  contentLabel: {
    fontWeight: font.weight_6,
    color: color.fgAccent,
  },
  contentToken: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  measureBar: {
    blockSize: space._2,
    maxInlineSize: "100%",
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  measureProse: { inlineSize: measure.prose },
  measureShort: { inlineSize: measure.short },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: rhythm.item,
  },
  layerScroll: {
    marginInline: `calc(-1 * ${space._1})`,
  },
  layerScroller: {
    paddingInline: space._1,
  },
  layerStack: {
    display: "flex",
    flexDirection: "column",
    paddingBlock: space._2,
    paddingInlineEnd: space._3,
    minInlineSize: "max-content",
    // Contain the z-index scale in its own stacking context so the negative
    // `background` layer paints above the section surface, not behind it.
    isolation: "isolate",
  },
  layerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    inlineSize: "180px",
    paddingBlock: space._2,
    paddingInline: space._3,
    marginBlockStart: `calc(-1 * ${space._1})`,
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  // A narrow step on a phone, so the whole stair fits beside the cards.
  layerOffset: (index: number) => ({
    transform: {
      default: `translateX(calc(${String(index)} * ${space._2}))`,
      [breakpoints.md]: `translateX(calc(${String(index)} * ${space._4}))`,
    },
  }),
  layerName: {
    fontFamily: font.familyMono,
    color: color.fg,
  },
  layerValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.fgAccent,
  },
  lzBackground: { zIndex: layer.background, marginBlockStart: 0 },
  lzBase: { zIndex: layer.base },
  lzContent: { zIndex: layer.content },
  lzEffect: { zIndex: layer.effect },
  lzBlur: { zIndex: layer.blur },
  lzRaised: { zIndex: layer.raised },
  lzHeader: { zIndex: layer.header },
  lzOverlay: { zIndex: layer.overlay },
  lzTooltip: { zIndex: layer.tooltip },
  lzToaster: { zIndex: layer.toaster },
  ratioFloor: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "88px",
  },
  ratioSwatch: {
    inlineSize: "100%",
    maxInlineSize: "112px",
    maxBlockSize: "88px",
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  arSquare: { aspectRatio: ratio.square },
  arGolden: { aspectRatio: ratio.golden },
  arTv: { aspectRatio: ratio.tv },
  arDouble: { aspectRatio: ratio.double },
  arWide: { aspectRatio: ratio.wide },
  arPoster: { aspectRatio: ratio.poster },
  arPortrait: { aspectRatio: ratio.portrait },
});
