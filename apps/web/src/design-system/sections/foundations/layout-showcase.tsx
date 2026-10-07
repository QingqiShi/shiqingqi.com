import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import {
  border,
  color,
  font,
  layer,
  ratio,
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
        title={t({ en: "Content width", zh: "内容宽度" })}
        lead={t({
          en: "layout.maxInlineSize is 1140px. HeaderFooterLayout with readingColumn, and SidebarLayout, centre their content and cap it there, so a page inside a shell already has it. Either shell takes contentMaxInlineSize for a narrower page.",
          zh: "layout.maxInlineSize 是 1140px。启用 readingColumn 的 HeaderFooterLayout 与 SidebarLayout 会把内容居中并限制在这个宽度，所以放在骨架里的页面已经有了它。要让页面更窄，两种骨架都接受 contentMaxInlineSize。",
        })}
      >
        <div css={[corner.radius_2, styles.viewport]} aria-hidden="true">
          <span css={styles.gutterLabel}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
          <div css={[corner.radius_1, styles.contentBand]}>
            <span css={styles.contentLabel}>
              {t({ en: "content", zh: "内容" })}
            </span>
            <span css={styles.contentToken}>max 1140px</span>
          </div>
          <span css={styles.gutterLabel}>
            {t({ en: "gutter", zh: "留白" })}
          </span>
        </div>
        <UsageSnippet
          code={`import { layout } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  // Outside a shell only.
  page: { maxInlineSize: layout.maxInlineSize, marginInline: "auto" },
});`}
        />
        <GuideNote>
          {t({
            en: "layout is a constant, not a Token you can override. It caps the page, not the length of a line of text.",
            zh: "layout 是常量，不是可以覆盖的令牌。它约束的是页面宽度，而不是一行文字的长度。",
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
                <span css={styles.layerName}>layer.{plane.name}</span>
                <span css={styles.layerValue}>{plane.value}</span>
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
  // Content-width schematic: a full-width "viewport" with a centred content band
  // and labelled gutters. Illustrative — the true cap is 1140px.
  viewport: {
    display: "flex",
    alignItems: "stretch",
    gap: space._1,
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
    fontSize: font.uiOverline,
    color: color.fgMuted,
    textAlign: "center",
  },
  contentBand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: space._00,
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._5,
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.borderAccent}`,
  },
  contentLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.fgAccent,
  },
  contentToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.fgMuted,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: space._3,
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
    gap: space._4,
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
    fontSize: font.uiBodySmall,
    color: color.fg,
  },
  layerValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.fgAccent,
    fontVariantNumeric: "tabular-nums",
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
