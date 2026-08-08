import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex, grow } from "@tuja/ui/primitives/flex.stylex";
import {
  absoluteFill,
  imageContain,
  imageCover,
  scrollX,
  truncate,
} from "@tuja/ui/primitives/layout.stylex";
import {
  animate,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

interface ApiEntry {
  token: string;
  meta: string;
  description: string;
}

/** Renders a responsive grid of {@link SpecCard} rows for a primitive's members. */
function ApiGrid({ entries }: { entries: ApiEntry[] }) {
  return (
    <div css={styles.apiGrid}>
      {entries.map((entry) => (
        <SpecCard key={entry.token} token={entry.token} meta={entry.meta}>
          <Text variant="caption" tone="muted">
            {entry.description}
          </Text>
        </SpecCard>
      ))}
    </div>
  );
}

/** Four-point star used by the reset and a11y specimens. */
function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M128 24 152 104 232 128 152 152 128 232 104 152 24 128 104 104Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FlexSection() {
  const api: ApiEntry[] = [
    {
      token: "flex.row",
      meta: "display:flex · align:center",
      description: t({
        en: "Horizontal row, items vertically centred — the everyday default.",
        zh: "水平行，子项垂直居中——最常用的默认布局。",
      }),
    },
    {
      token: "flex.col",
      meta: "display:flex · direction:column",
      description: t({ en: "Vertical stack.", zh: "垂直堆叠。" }),
    },
    {
      token: "flex.center",
      meta: "align:center · justify:center",
      description: t({
        en: "Centred on both axes.",
        zh: "在两个轴向上都居中。",
      }),
    },
    {
      token: "flex.between",
      meta: "align:center · justify:space-between",
      description: t({
        en: "Toolbar pattern — ends pushed apart, centred.",
        zh: "工具栏模式——两端分开，垂直居中。",
      }),
    },
    {
      token: "flex.wrap",
      meta: "flex-wrap:wrap · align:center",
      description: t({
        en: "Wrapping row for chips and badges.",
        zh: "用于标签按钮与徽章的换行行。",
      }),
    },
    {
      token: "flex.inlineCenter",
      meta: "display:inline-flex · center",
      description: t({
        en: "Inline centred box for icon-plus-label controls.",
        zh: "内联居中盒，用于图标加文字的控件。",
      }),
    },
    {
      token: "align / justify",
      meta: "start · center · end · …",
      description: t({
        en: "Single-property modifiers that override a flex primitive's defaults.",
        zh: "单属性修饰符，用于覆盖 flex 原语的默认对齐方式。",
      }),
    },
    {
      token: "grow / shrink",
      meta: "_0 · _1",
      description: t({
        en: "Toggle flex-grow / flex-shrink to fill or hold remaining space.",
        zh: "切换 flex-grow / flex-shrink，用于占满或保持剩余空间。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Flex", zh: "Flex 布局" })}>
      <ShowcaseHelper>
        {t({
          en: "Multi-property flex primitives. Drop to them when composing a bespoke layout the component library doesn't cover — they encode the alignment defaults so a callsite reads as intent, not CSS plumbing.",
          zh: "多属性 flex 原语。当组件库未覆盖某个自定义布局时下沉到它们——它们封装了对齐默认值，让调用处读起来是意图而非 CSS 细节。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen
          caption={t({
            en: "flex.between — toolbar",
            zh: "flex.between —— 工具栏",
          })}
        >
          <div css={[flex.between, corner.radius_2, styles.bar]}>
            <Text as="span" variant="bodySmall" weight="semibold">
              {t({ en: "Library", zh: "媒体库" })}
            </Text>
            <div css={[flex.row, styles.barActions]}>
              <span css={[corner.radius_round, styles.pill]}>
                {t({ en: "Filter", zh: "筛选" })}
              </span>
              <span css={[corner.radius_round, styles.pill, styles.pillAccent]}>
                {t({ en: "Sort", zh: "排序" })}
              </span>
            </div>
          </div>
        </Specimen>
        <Specimen
          caption={t({ en: "flex.wrap — chips", zh: "flex.wrap —— 标签按钮" })}
        >
          <div css={[flex.wrap, styles.chipRow]}>
            <span css={[corner.radius_round, styles.chip]}>
              {t({ en: "Drama", zh: "剧情" })}
            </span>
            <span css={[corner.radius_round, styles.chip]}>
              {t({ en: "Sci-fi", zh: "科幻" })}
            </span>
            <span css={[corner.radius_round, styles.chip]}>
              {t({ en: "Thriller", zh: "惊悚" })}
            </span>
            <span css={[corner.radius_round, styles.chip]}>
              {t({ en: "Comedy", zh: "喜剧" })}
            </span>
          </div>
        </Specimen>
        <Specimen caption="flex.row + grow._1">
          <div css={[flex.row, styles.growRow]}>
            <span css={[grow._1, corner.radius_2, styles.growField]}>
              {t({ en: "Search titles", zh: "搜索标题" })}
            </span>
            <span css={[corner.radius_round, styles.pill, styles.pillAccent]}>
              {t({ en: "Go", zh: "搜索" })}
            </span>
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { flex, align, grow } from "@tuja/ui/primitives/flex.stylex";

<header css={flex.between}>…</header>
<div css={[flex.row, align.end]}>…</div>
<div css={[flex.row, grow._1]}>…</div>`}
      />
    </Showcase>
  );
}

function LayoutSection() {
  const sampleImage = `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7c5cff'/><stop offset='1' stop-color='#22d3ee'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/><circle cx='160' cy='90' r='52' fill='#ffffff' fill-opacity='0.92'/></svg>",
  )}`;
  const imageAlt = t({ en: "Sample 16:9 artwork", zh: "示例 16:9 图像" });

  const api: ApiEntry[] = [
    {
      token: "absoluteFill.all / x / y",
      meta: "position:absolute · inset:0",
      description: t({
        en: "Pin an overlay to its positioned parent on both axes or just one.",
        zh: "将覆盖层固定到定位父元素——两个轴向或单个轴向。",
      }),
    },
    {
      token: "fixedFill.all",
      meta: "position:fixed · inset:0",
      description: t({
        en: "Full-viewport layer for scrims and modal backdrops.",
        zh: "铺满视口的层，用于遮罩与模态背景。",
      }),
    },
    {
      token: "fill.inline",
      meta: "inline-size:100%",
      description: t({
        en: "Take the whole track. A block-level child of a flex or grid parent shrinks to its content otherwise.",
        zh: "占满整个轨道。否则，弹性或网格父元素下的块级子元素会收缩到内容宽度。",
      }),
    },
    {
      token: "scrollX.base / focusRing",
      meta: "overflow-x:auto · scrollbar:none",
      description: t({
        en: "Horizontal scroller; add focusRing for a keyboard-navigable strip.",
        zh: "水平滚动容器；加上 focusRing 即可用键盘导航。",
      }),
    },
    {
      token: "scrollY.base",
      meta: "overflow-y:auto",
      description: t({
        en: "Vertical scroll container.",
        zh: "垂直滚动容器。",
      }),
    },
    {
      token: "truncate.base",
      meta: "overflow · ellipsis · nowrap",
      description: t({
        en: "The three-property single-line ellipsis primitive.",
        zh: "单行省略号的三属性原语。",
      }),
    },
    {
      token: "imageCover.base",
      meta: "object-fit:cover · 100%",
      description: t({
        en: "Fill the frame and crop the overflow — poster art, avatars.",
        zh: "填满外框并裁掉溢出——海报、头像。",
      }),
    },
    {
      token: "imageContain.base",
      meta: "object-fit:contain · 100%",
      description: t({
        en: "Fit the whole image inside the frame, letterboxing as needed.",
        zh: "在外框内完整显示图像，必要时留边。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Layout", zh: "布局" })}>
      <ShowcaseHelper>
        {t({
          en: "Position fills, scroll containers, truncation, and image fit — the recurring layout primitives that would otherwise be copy-pasted property clusters.",
          zh: "定位填充、滚动容器、文本截断与图像适配——否则就得到处复制粘贴的重复布局原语。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen caption="truncate.base">
          <div css={[corner.radius_2, styles.truncateBox, truncate.base]}>
            {t({
              en: "The Shawshank Redemption — Extended Director's Cut, Remastered",
              zh: "肖申克的救赎——加长导演剪辑版，重制修复",
            })}
          </div>
        </Specimen>
        <Specimen
          caption={t({
            en: "absoluteFill.all — overlay",
            zh: "absoluteFill.all —— 覆盖层",
          })}
        >
          <div css={[corner.radius_2, styles.fillTile]}>
            <div css={[absoluteFill.all, styles.fillScrim]}>
              <span css={styles.fillLabel}>
                {t({ en: "Now playing", zh: "正在播放" })}
              </span>
            </div>
          </div>
        </Specimen>
        <Specimen caption="scrollX.base + focusRing">
          <div
            tabIndex={0}
            css={[scrollX.base, scrollX.focusRing, styles.scrollStrip]}
            aria-label={t({ en: "Scrollable strip", zh: "可滚动条带" })}
          >
            <div css={[flex.row, styles.scrollTrack]}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} css={[corner.radius_2, styles.scrollTile]}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </Specimen>
        <Specimen
          caption={t({
            en: "imageCover vs imageContain",
            zh: "imageCover 与 imageContain",
          })}
        >
          <div css={[flex.row, styles.imagePair]}>
            <div css={[corner.radius_2, styles.imageFrame]}>
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data-URI specimen, not a remote asset */}
              <img src={sampleImage} alt={imageAlt} css={imageCover.base} />
            </div>
            <div css={[corner.radius_2, styles.imageFrame]}>
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data-URI specimen, not a remote asset */}
              <img src={sampleImage} alt={imageAlt} css={imageContain.base} />
            </div>
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { truncate, absoluteFill, imageCover } from "@tuja/ui/primitives/layout.stylex";

<span css={truncate.base}>{longTitle}</span>
<div css={absoluteFill.all}>{scrim}</div>
<img css={imageCover.base} src={src} alt={alt} />`}
      />
    </Showcase>
  );
}

function MotionSection() {
  const transitions: ApiEntry[] = [
    {
      token: "transition.colors",
      meta: "color · background · border",
      description: t({
        en: "Fades colour changes on hover and state.",
        zh: "在悬停与状态变化时平滑过渡颜色。",
      }),
    },
    {
      token: "transition.transform",
      meta: "transform 200ms · reduced:none",
      description: t({
        en: "Movement that is dropped entirely under reduced-motion.",
        zh: "在减少动态偏好下会被完全移除的位移过渡。",
      }),
    },
    {
      token: "transition.opacity / shadow",
      meta: "opacity · box-shadow 200ms",
      description: t({
        en: "Isolated fades and elevation changes.",
        zh: "独立的淡入淡出与高度变化。",
      }),
    },
    {
      token: "transition.all / none",
      meta: "all 200ms · none",
      description: t({
        en: "Broad transition, or an explicit opt-out.",
        zh: "整体过渡，或显式关闭过渡。",
      }),
    },
  ];
  const animations: ApiEntry[] = [
    {
      token: "animate.fadeIn / fadeOut",
      meta: "opacity 200ms",
      description: t({
        en: "Enter / exit opacity.",
        zh: "进入 / 退出的透明度动画。",
      }),
    },
    {
      token: "animate.slideUp / slideDown",
      meta: "translateY 300ms · reduced:off",
      description: t({
        en: "Sheet-style entrances, disabled under reduced-motion.",
        zh: "抽屉式入场，在减少动态偏好下禁用。",
      }),
    },
    {
      token: "animate.pulse / bounce",
      meta: "infinite",
      description: t({
        en: "Loading affordances — pulse for skeletons, bounce for dots.",
        zh: "加载提示——pulse 用于骨架屏，bounce 用于圆点。",
      }),
    },
    {
      token: "animate.expand / collapse",
      meta: "grid-rows 0fr↔1fr 300ms",
      description: t({
        en: "Height animation for disclosures.",
        zh: "用于展开/收起的高度动画。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Motion", zh: "动效" })}>
      <ShowcaseHelper>
        {t({
          en: "Transition and animation presets, each with its reduced-motion story built in. Compose them onto a custom element instead of hand-writing keyframes. The Motion foundation documents the full duration and easing scales.",
          zh: "过渡与动画预设，每一个都内建了减少动态偏好的处理。将它们组合到自定义元素上，而不必手写关键帧。动效基础页记录了完整的时长与缓动阶梯。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen
          caption={t({
            en: "transition.colors — hover",
            zh: "transition.colors —— 悬停",
          })}
        >
          <div css={[transition.colors, corner.radius_2, styles.hoverTile]}>
            {t({ en: "Hover me", zh: "悬停试试" })}
          </div>
        </Specimen>
        <Specimen
          caption={t({
            en: "animate.bounce — loading dots",
            zh: "animate.bounce —— 加载圆点",
          })}
        >
          <div css={[flex.row, styles.dotRow]}>
            <span
              css={[
                animate.bounce,
                styles.reduceMotionPause,
                corner.radius_round,
                styles.dot,
                styles.dotDelay0,
              ]}
            />
            <span
              css={[
                animate.bounce,
                styles.reduceMotionPause,
                corner.radius_round,
                styles.dot,
                styles.dotDelay1,
              ]}
            />
            <span
              css={[
                animate.bounce,
                styles.reduceMotionPause,
                corner.radius_round,
                styles.dot,
                styles.dotDelay2,
              ]}
            />
          </div>
        </Specimen>
        <Specimen
          caption={t({
            en: "animate.pulse — skeleton",
            zh: "animate.pulse —— 骨架屏",
          })}
        >
          <div css={[flex.col, styles.skeletonStack]}>
            <span
              css={[
                animate.pulse,
                styles.reduceMotionPause,
                corner.radius_round,
                styles.skeletonBar,
              ]}
            />
            <span
              css={[
                animate.pulse,
                styles.reduceMotionPause,
                corner.radius_round,
                styles.skeletonBarShort,
              ]}
            />
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={transitions} />
      <ApiGrid entries={animations} />
      <UsageSnippet
        code={`import { transition, animate } from "@tuja/ui/primitives/motion.stylex";

<a css={transition.colors}>…</a>
<div css={animate.fadeIn}>…</div>`}
      />
    </Showcase>
  );
}

function ResetSection() {
  const api: ApiEntry[] = [
    {
      token: "buttonReset.base",
      meta: "appearance · border · bg · padding · cursor",
      description: t({
        en: "Strips native button chrome so you can build a custom control on top of real, accessible <button> semantics.",
        zh: "移除原生按钮外观，让你在真正可访问的 <button> 语义之上构建自定义控件。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Reset", zh: "重置" })}>
      <ShowcaseHelper>
        {t({
          en: "Neutralise browser defaults without abandoning semantics. Reach for buttonReset when a distinctive control needs full styling control but must stay a keyboard- and screen-reader-friendly <button>.",
          zh: "在不放弃语义的前提下抹平浏览器默认样式。当某个独特控件需要完全掌控样式、又必须保持对键盘和屏幕阅读器友好的 <button> 时，使用 buttonReset。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen
          caption={t({
            en: "A fully custom control on a real <button>",
            zh: "构建在真实 <button> 上的完全自定义控件",
          })}
        >
          <button
            type="button"
            css={[
              buttonReset.base,
              flex.inlineCenter,
              a11y.focusRing,
              corner.radius_round,
              styles.customControl,
            ]}
          >
            <span css={styles.icon}>
              <SparkleIcon />
            </span>
            {t({ en: "Add to list", zh: "加入清单" })}
          </button>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { buttonReset } from "@tuja/ui/primitives/reset.stylex";

<button type="button" css={[buttonReset.base, styles.control]}>
  {icon}
  {label}
</button>`}
      />
    </Showcase>
  );
}

function CornerSection() {
  const api: ApiEntry[] = [
    {
      token: "corner.radius_1 – radius_5",
      meta: "_1 · _2 · _3 · _4 · _5",
      description: t({
        en: "Squircle corner at each border.radius step — borderRadius and cornerShape in one declaration.",
        zh: "在每一级 border.radius 上配对的超椭圆角——borderRadius 与 cornerShape 写在同一条声明里。",
      }),
    },
    {
      token: "corner.radius_round",
      meta: "cornerShape:squircle",
      description: t({
        en: "Squircle corner for pills, avatars, and circles.",
        zh: "用于胶囊形、头像与圆形的超椭圆角。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Corner", zh: "圆角原语" })}>
      <ShowcaseHelper>
        {t({
          en: 'Pairs a border.radius step with cornerShape: "squircle" in one declaration, so every rounded corner ships as a squircle without a global corner-shape rule. A browser without corner-shape support keeps circular corners.',
          zh: '在同一条声明中把某一级 border.radius 与 cornerShape: "squircle" 配对，让每个圆角都以超椭圆角出厂，无需全局 corner-shape 规则。不支持 corner-shape 的浏览器会回退为圆弧。',
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen caption="corner.radius_3 — card">
          <div css={[corner.radius_3, styles.cornerCard]} />
        </Specimen>
        <Specimen caption="corner.radius_round — pill">
          <span css={[corner.radius_round, styles.cornerPill]}>
            {t({ en: "Popular", zh: "热门" })}
          </span>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { corner } from "@tuja/ui/primitives/corner.stylex";

<div css={corner.radius_3}>…</div>
<span css={corner.radius_round}>…</span>`}
      />
    </Showcase>
  );
}

function A11ySection() {
  const api: ApiEntry[] = [
    {
      token: "a11y.srOnly",
      meta: "clip-path:inset(50%) · 1px box",
      description: t({
        en: "Visually hidden, still announced — the canonical accessible-name primitive.",
        zh: "视觉上隐藏但仍会被朗读——标准的可访问名称原语。",
      }),
    },
    {
      token: "a11y.focusRing",
      meta: "2px accent · offset 2px · :focus-visible",
      description: t({
        en: "The shared keyboard focus indicator (WCAG 2.4.7). Use by default.",
        zh: "共享的键盘焦点指示器（WCAG 2.4.7）。默认使用。",
      }),
    },
    {
      token: "a11y.focusRingInset",
      meta: "offset -2px · :focus-visible",
      description: t({
        en: "Same ring pulled inside, for elements a clipped ancestor would crop.",
        zh: "同样的焦点环但向内偏移，用于会被裁切祖先元素裁掉外环的情况。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Accessibility", zh: "无障碍" })}>
      <ShowcaseHelper>
        {t({
          en: "The accessibility primitives that ship in the base of every component — surfaced here so a custom control built from primitives can inherit the same guarantees rather than reinventing them.",
          zh: "随每个组件基座一同交付的无障碍原语——在此单独呈现，让由原语搭建的自定义控件能继承同样的保证，而无需重新发明。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen
          caption={t({
            en: "srOnly names an icon-only control",
            zh: "srOnly 为纯图标控件提供名称",
          })}
        >
          <button
            type="button"
            css={[
              buttonReset.base,
              flex.center,
              a11y.focusRing,
              corner.radius_round,
              styles.iconButton,
            ]}
          >
            <span css={styles.icon}>
              <SparkleIcon />
            </span>
            <span css={a11y.srOnly}>
              {t({ en: "Add to favourites", zh: "加入收藏" })}
            </span>
          </button>
        </Specimen>
        <Specimen
          caption={t({
            en: "focusRing — Tab to reveal",
            zh: "focusRing —— 按 Tab 显示",
          })}
        >
          <button
            type="button"
            css={[
              buttonReset.base,
              flex.center,
              a11y.focusRing,
              corner.radius_2,
              styles.focusTile,
            ]}
          >
            {t({ en: "Focus me", zh: "聚焦我" })}
          </button>
        </Specimen>
        <Specimen
          caption={t({
            en: "focusRingInset — ring stays inside a clipped frame",
            zh: "focusRingInset —— 焦点环留在被裁切外框内",
          })}
        >
          <div css={[corner.radius_2, styles.clipFrame]}>
            <button
              type="button"
              css={[
                buttonReset.base,
                flex.center,
                a11y.focusRingInset,
                corner.radius_1,
                styles.insetTile,
              ]}
            >
              {t({ en: "Focus me", zh: "聚焦我" })}
            </button>
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { a11y } from "@tuja/ui/primitives/a11y.stylex";

<button css={a11y.focusRing}>
  {icon}
  <span css={a11y.srOnly}>{accessibleName}</span>
</button>`}
      />
    </Showcase>
  );
}

export function PrimitivesShowcase() {
  return (
    <>
      <FlexSection />
      <LayoutSection />
      <MotionSection />
      <ResetSection />
      <CornerSection />
      <A11ySection />
    </>
  );
}

const styles = stylex.create({
  // Wider tracks than the default: a toolbar, a scroller and a pair of image
  // frames all need more room than a button does.
  specimenTracks: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(240px, 1fr))",
    },
  },
  apiGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(220px, 1fr))",
    },
    gap: space._2,
  },
  // Flex specimens
  bar: {
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  barActions: {
    gap: space._1,
  },
  pill: {
    paddingBlock: space._00,
    paddingInline: space._2,
    fontSize: font.uiCaption,
    fontWeight: font.weight_5,
    color: color.textMuted,
    backgroundColor: color.bgInteractiveRest,
    whiteSpace: "nowrap",
  },
  pillAccent: {
    color: color.accentText,
    backgroundColor: color.surfaceAccentSubtle,
  },
  chipRow: {
    gap: space._1,
    inlineSize: "100%",
  },
  chip: {
    paddingBlock: space._00,
    paddingInline: space._2,
    fontSize: font.uiCaption,
    color: color.textMuted,
    backgroundColor: color.bgInteractiveRest,
    whiteSpace: "nowrap",
  },
  growRow: {
    gap: space._2,
    inlineSize: "100%",
  },
  growField: {
    paddingBlock: space._1,
    paddingInline: space._3,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // Layout specimens
  truncateBox: {
    inlineSize: "100%",
    maxInlineSize: "220px",
    paddingBlock: space._1,
    paddingInline: space._3,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  fillTile: {
    position: "relative",
    inlineSize: "100%",
    blockSize: "96px",
    overflow: "hidden",
    backgroundImage: `linear-gradient(135deg, ${color.accent}, ${color.info})`,
  },
  fillScrim: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundImage: `linear-gradient(to top, ${color.bgScrim}, transparent)`,
  },
  fillLabel: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textOnInverse,
  },
  scrollStrip: {
    inlineSize: "100%",
    paddingBlock: space._1,
  },
  scrollTrack: {
    gap: space._2,
    inlineSize: "max-content",
  },
  scrollTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "72px",
    blockSize: "48px",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  imagePair: {
    gap: space._2,
    inlineSize: "100%",
  },
  imageFrame: {
    inlineSize: "80px",
    blockSize: "80px",
    flexShrink: 0,
    overflow: "hidden",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  // Motion specimens
  hoverTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    paddingBlock: space._3,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.accentOn },
    backgroundColor: {
      default: color.bgInteractiveRest,
      ":hover": color.accent,
    },
  },
  dotRow: {
    gap: space._2,
  },
  dot: {
    inlineSize: "12px",
    blockSize: "12px",
    backgroundColor: color.accent,
  },
  dotDelay0: {
    animationDelay: "0ms",
  },
  dotDelay1: {
    animationDelay: "160ms",
  },
  dotDelay2: {
    animationDelay: "320ms",
  },
  skeletonStack: {
    gap: space._2,
    inlineSize: "100%",
  },
  skeletonBar: {
    blockSize: "12px",
    inlineSize: "100%",
    backgroundColor: color.bgInteractiveHover,
  },
  skeletonBarShort: {
    blockSize: "12px",
    inlineSize: "60%",
    backgroundColor: color.bgInteractiveHover,
  },
  // Pauses infinite animations for viewers who prefer reduced motion.
  reduceMotionPause: {
    animationPlayState: {
      default: "running",
      [motionConstants.REDUCED_MOTION]: "paused",
    },
  },
  // Corner specimens — corner.* already sets borderRadius, so these only add
  // the fill and text styling around it.
  cornerCard: {
    inlineSize: "100%",
    blockSize: "72px",
    backgroundColor: color.surfaceAccentSubtle,
    boxShadow: `inset 0 0 0 1px ${color.accentBorder}`,
  },
  cornerPill: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._1,
    paddingInline: space._4,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.accentText,
    backgroundColor: color.surfaceAccentSubtle,
  },
  // Reset + a11y specimens
  customControl: {
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.accentOn,
    backgroundColor: color.accent,
  },
  icon: {
    display: "inline-flex",
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_0,
  },
  iconButton: {
    inlineSize: "40px",
    blockSize: "40px",
    fontSize: font.uiHeading3,
    color: color.textMuted,
    backgroundColor: color.bgInteractiveRest,
  },
  focusTile: {
    paddingBlock: space._2,
    paddingInline: space._4,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMain,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  clipFrame: {
    padding: space._1,
    overflow: "hidden",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  insetTile: {
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._4,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMain,
    backgroundColor: color.bgSurface,
  },
});
