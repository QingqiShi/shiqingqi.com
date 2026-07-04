import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
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
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { SpecCard } from "../../spec-card.tsx";
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

/** A captioned demo cell — the live specimen sits above a muted caption. */
function DemoCell({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div css={styles.demoCell}>
      <div css={styles.demoStage}>{children}</div>
      <Text variant="caption" tone="subtle">
        {caption}
      </Text>
    </div>
  );
}

/** Four-point star used by the reset and a11y demos. */
function SparkleGlyph() {
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
        en: "Wrapping row for chips and tags.",
        zh: "用于标签与筹码的换行行。",
      }),
    },
    {
      token: "flex.inlineCenter",
      meta: "display:inline-flex · center",
      description: t({
        en: "Inline centred box for glyph-plus-label controls.",
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
          en: "Multi-property flex recipes. Drop to them when composing a bespoke layout the component library doesn't cover — they encode the alignment defaults so a callsite reads as intent, not CSS plumbing.",
          zh: "多属性 flex 组合。当组件库未覆盖某个自定义布局时下沉到它们——它们封装了对齐默认值，让调用处读起来是意图而非 CSS 细节。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell
          caption={t({
            en: "flex.between — toolbar",
            zh: "flex.between —— 工具栏",
          })}
        >
          <div css={[flex.between, styles.bar]}>
            <Text as="span" variant="bodySmall" weight="semibold">
              {t({ en: "Library", zh: "媒体库" })}
            </Text>
            <div css={[flex.row, styles.barActions]}>
              <span css={styles.pill}>{t({ en: "Filter", zh: "筛选" })}</span>
              <span css={[styles.pill, styles.pillAccent]}>
                {t({ en: "Sort", zh: "排序" })}
              </span>
            </div>
          </div>
        </DemoCell>
        <DemoCell
          caption={t({ en: "flex.wrap — chips", zh: "flex.wrap —— 筹码" })}
        >
          <div css={[flex.wrap, styles.chipRow]}>
            <span css={styles.chip}>{t({ en: "Drama", zh: "剧情" })}</span>
            <span css={styles.chip}>{t({ en: "Sci-fi", zh: "科幻" })}</span>
            <span css={styles.chip}>{t({ en: "Thriller", zh: "惊悚" })}</span>
            <span css={styles.chip}>{t({ en: "Comedy", zh: "喜剧" })}</span>
          </div>
        </DemoCell>
        <DemoCell
          caption={t({ en: "flex.row + grow._1", zh: "flex.row + grow._1" })}
        >
          <div css={[flex.row, styles.growRow]}>
            <span css={[grow._1, styles.growField]}>
              {t({ en: "Search titles", zh: "搜索标题" })}
            </span>
            <span css={[styles.pill, styles.pillAccent]}>
              {t({ en: "Go", zh: "搜索" })}
            </span>
          </div>
        </DemoCell>
      </div>
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
  const demoImage = `data:image/svg+xml,${encodeURIComponent(
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
        en: "The three-property single-line ellipsis recipe.",
        zh: "单行省略号的三属性配方。",
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
          en: "Position fills, scroll containers, truncation, and image fit — the recurring layout recipes that would otherwise be copy-pasted property clusters.",
          zh: "定位填充、滚动容器、文本截断与图像适配——否则就得到处复制粘贴的重复布局配方。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell caption={t({ en: "truncate.base", zh: "truncate.base" })}>
          <div css={[styles.truncateBox, truncate.base]}>
            {t({
              en: "The Shawshank Redemption — Extended Director's Cut, Remastered",
              zh: "肖申克的救赎——加长导演剪辑版，重制修复",
            })}
          </div>
        </DemoCell>
        <DemoCell
          caption={t({
            en: "absoluteFill.all — overlay",
            zh: "absoluteFill.all —— 覆盖层",
          })}
        >
          <div css={styles.fillTile}>
            <div css={[absoluteFill.all, styles.fillScrim]}>
              <span css={styles.fillLabel}>
                {t({ en: "Now playing", zh: "正在播放" })}
              </span>
            </div>
          </div>
        </DemoCell>
        <DemoCell
          caption={t({
            en: "scrollX.base + focusRing",
            zh: "scrollX.base + focusRing",
          })}
        >
          <div
            tabIndex={0}
            css={[scrollX.base, scrollX.focusRing, styles.scrollStrip]}
            aria-label={t({ en: "Scrollable strip", zh: "可滚动条带" })}
          >
            <div css={[flex.row, styles.scrollTrack]}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} css={styles.scrollTile}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </DemoCell>
        <DemoCell
          caption={t({
            en: "imageCover vs imageContain",
            zh: "imageCover 与 imageContain",
          })}
        >
          <div css={[flex.row, styles.imagePair]}>
            <div css={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data-URI specimen, not a remote asset */}
              <img src={demoImage} alt={imageAlt} css={imageCover.base} />
            </div>
            <div css={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data-URI specimen, not a remote asset */}
              <img src={demoImage} alt={imageAlt} css={imageContain.base} />
            </div>
          </div>
        </DemoCell>
      </div>
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
      <div css={styles.demoGrid}>
        <DemoCell
          caption={t({
            en: "transition.colors — hover",
            zh: "transition.colors —— 悬停",
          })}
        >
          <div css={[transition.colors, styles.hoverTile]}>
            {t({ en: "Hover me", zh: "悬停试试" })}
          </div>
        </DemoCell>
        <DemoCell
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
                styles.dot,
                styles.dotDelay0,
              ]}
            />
            <span
              css={[
                animate.bounce,
                styles.reduceMotionPause,
                styles.dot,
                styles.dotDelay1,
              ]}
            />
            <span
              css={[
                animate.bounce,
                styles.reduceMotionPause,
                styles.dot,
                styles.dotDelay2,
              ]}
            />
          </div>
        </DemoCell>
        <DemoCell
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
                styles.skeletonBar,
              ]}
            />
            <span
              css={[
                animate.pulse,
                styles.reduceMotionPause,
                styles.skeletonBarShort,
              ]}
            />
          </div>
        </DemoCell>
      </div>
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
      <div css={styles.demoGrid}>
        <DemoCell
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
              styles.customControl,
            ]}
          >
            <span css={styles.glyph}>
              <SparkleGlyph />
            </span>
            {t({ en: "Add to list", zh: "加入清单" })}
          </button>
        </DemoCell>
      </div>
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

function A11ySection() {
  const api: ApiEntry[] = [
    {
      token: "a11y.srOnly",
      meta: "clip-path:inset(50%) · 1px box",
      description: t({
        en: "Visually hidden, still announced — the canonical accessible-name recipe.",
        zh: "视觉上隐藏但仍会被朗读——标准的可访问名称配方。",
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
          en: "The accessibility recipes that ship in the base of every component — surfaced here so a custom control built from primitives can inherit the same guarantees rather than reinventing them.",
          zh: "随每个组件基座一同交付的无障碍配方——在此单独呈现，让由原语搭建的自定义控件能继承同样的保证，而无需重新发明。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell
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
              styles.iconButton,
            ]}
          >
            <span css={styles.glyph}>
              <SparkleGlyph />
            </span>
            <span css={a11y.srOnly}>
              {t({ en: "Add to favourites", zh: "加入收藏" })}
            </span>
          </button>
        </DemoCell>
        <DemoCell
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
              styles.focusTile,
            ]}
          >
            {t({ en: "Focus me", zh: "聚焦我" })}
          </button>
        </DemoCell>
        <DemoCell
          caption={t({
            en: "focusRingInset — ring stays inside a clipped frame",
            zh: "focusRingInset —— 焦点环留在被裁切外框内",
          })}
        >
          <div css={styles.clipFrame}>
            <button
              type="button"
              css={[
                buttonReset.base,
                flex.center,
                a11y.focusRingInset,
                styles.insetTile,
              ]}
            >
              {t({ en: "Focus me", zh: "聚焦我" })}
            </button>
          </div>
        </DemoCell>
      </div>
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
      <A11ySection />
    </>
  );
}

const styles = stylex.create({
  demoGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(240px, 1fr))",
    },
    gap: space._3,
  },
  demoCell: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    minInlineSize: 0,
  },
  demoStage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    minBlockSize: "80px",
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  apiGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(220px, 1fr))",
    },
    gap: space._2,
  },
  // Flex demos
  bar: {
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  barActions: {
    gap: space._1,
  },
  pill: {
    paddingBlock: space._00,
    paddingInline: space._2,
    borderRadius: border.radius_round,
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
    borderRadius: border.radius_round,
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
    borderRadius: border.radius_2,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // Layout demos
  truncateBox: {
    inlineSize: "100%",
    maxInlineSize: "220px",
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  fillTile: {
    position: "relative",
    inlineSize: "100%",
    blockSize: "96px",
    borderRadius: border.radius_2,
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
    borderRadius: border.radius_2,
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
    borderRadius: border.radius_2,
    overflow: "hidden",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  // Motion demos
  hoverTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    paddingBlock: space._3,
    borderRadius: border.radius_2,
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
    borderRadius: border.radius_round,
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
    borderRadius: border.radius_round,
    backgroundColor: color.bgInteractiveHover,
  },
  skeletonBarShort: {
    blockSize: "12px",
    inlineSize: "60%",
    borderRadius: border.radius_round,
    backgroundColor: color.bgInteractiveHover,
  },
  // Pauses infinite animations for viewers who prefer reduced motion.
  reduceMotionPause: {
    animationPlayState: {
      default: "running",
      [motionConstants.REDUCED_MOTION]: "paused",
    },
  },
  // Reset + a11y demos
  customControl: {
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.accentOn,
    backgroundColor: color.accent,
  },
  glyph: {
    display: "inline-flex",
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_0,
  },
  iconButton: {
    inlineSize: "40px",
    blockSize: "40px",
    borderRadius: border.radius_round,
    fontSize: font.uiHeading3,
    color: color.textMuted,
    backgroundColor: color.bgInteractiveRest,
  },
  focusTile: {
    paddingBlock: space._2,
    paddingInline: space._4,
    borderRadius: border.radius_2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMain,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  clipFrame: {
    padding: space._1,
    borderRadius: border.radius_2,
    overflow: "hidden",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  insetTile: {
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._4,
    borderRadius: border.radius_1,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMain,
    backgroundColor: color.bgSurface,
  },
});
