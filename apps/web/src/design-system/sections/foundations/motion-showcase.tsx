import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { easing, transition } from "@tuja/ui/primitives/motion.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { MotionHoldBackSpecimen } from "./motion-hold-back-specimen.tsx";
import { MotionKeyframePresets } from "./motion-keyframe-presets.tsx";
import { ReducedMotionSpecimen } from "./reduced-motion-specimen.tsx";

// Every step of `duration.*`, drawn in proportion (2000ms is a full track).
const DURATIONS = [
  { token: "duration._75", ms: 75 },
  { token: "duration._100", ms: 100 },
  { token: "duration._150", ms: 150 },
  { token: "duration._200", ms: 200 },
  { token: "duration._300", ms: 300 },
  { token: "duration._400", ms: 400 },
  { token: "duration._500", ms: 500 },
  { token: "duration._700", ms: 700 },
  { token: "duration._800", ms: 800 },
  { token: "duration._1000", ms: 1000 },
  { token: "duration._1400", ms: 1400 },
  { token: "duration._1600", ms: 1600 },
  { token: "duration._2000", ms: 2000 },
];
const MAX_MS = 2000;

// SVG y grows downward, so progress is flipped to keep the curve rising.
function bezierPath([x1, y1, x2, y2]: number[]) {
  const c1x = (x1 * 100).toFixed(1);
  const c1y = (100 - y1 * 100).toFixed(1);
  const c2x = (x2 * 100).toFixed(1);
  const c2y = (100 - y2 * 100).toFixed(1);
  return `M0,100 C${c1x},${c1y} ${c2x},${c2y} 100,0`;
}

function linearPath(token: string) {
  const stops = token
    .slice(token.indexOf("(") + 1, -1)
    .split(",")
    .map((stop) => Number(stop));
  const points = stops.map(
    (stop, index) =>
      `${((index / (stops.length - 1)) * 100).toFixed(1)},${(100 - stop * 100).toFixed(1)}`,
  );
  return `M${points.join(" L")}`;
}

const EASINGS = [
  {
    token: "easing.spring",
    curve: "linear(0, 0.116, … 0.999, 1)",
    path: linearPath(easing.spring),
  },
  {
    token: "easing.springFallback",
    curve: "cubic-bezier(0.34, 1.3, 0.35, 1)",
    path: bezierPath([0.34, 1.3, 0.35, 1]),
  },
  {
    token: "easing.entrance",
    curve: "cubic-bezier(0.32, 0.72, 0, 1)",
    path: bezierPath([0.32, 0.72, 0, 1]),
  },
  { token: "easing.linear", curve: "linear", path: bezierPath([0, 0, 1, 1]) },
  {
    token: "easing.ease",
    curve: "ease",
    path: bezierPath([0.25, 0.1, 0.25, 1]),
  },
  {
    token: "easing.easeIn",
    curve: "ease-in",
    path: bezierPath([0.42, 0, 1, 1]),
  },
  {
    token: "easing.easeOut",
    curve: "ease-out",
    path: bezierPath([0, 0, 0.58, 1]),
  },
  {
    token: "easing.easeInOut",
    curve: "ease-in-out",
    path: bezierPath([0.42, 0, 0.58, 1]),
  },
  {
    token: "easing.pulse",
    curve: "cubic-bezier(.4,0,.6,1)",
    path: bezierPath([0.4, 0, 0.6, 1]),
  },
];

export function MotionShowcase() {
  const presets = [
    {
      term: "transition.colors",
      value: t({
        en: "Text, background and border colour · 200ms · ease",
        zh: "文字、背景与边框颜色 · 200 毫秒 · ease",
      }),
      note: t({
        en: "Kept under reduced motion. The fields, Chip, Callout, Breadcrumb and an interactive Card use it for hover and state.",
        zh: "减弱动效时保留。各表单字段、Chip、Callout、Breadcrumb 与可交互的 Card 都用它表现悬停与状态变化。",
      }),
    },
    {
      term: "transition.opacity",
      value: t({
        en: "Opacity · 200ms · ease",
        zh: "不透明度 · 200 毫秒 · ease",
      }),
      note: t({
        en: "Kept under reduced motion.",
        zh: "减弱动效时保留。",
      }),
    },
    {
      term: "transition.transform",
      value: t({
        en: "Transform · 200ms · ease",
        zh: "transform · 200 毫秒 · ease",
      }),
      note: t({
        en: "Removed under reduced motion: the element takes its new transform at once. Disclosure turns its caret with it.",
        zh: "减弱动效时移除：元素立即变为新的 transform。Disclosure 用它旋转箭头。",
      }),
    },
    {
      term: "transition.all",
      value: t({
        en: "Every property · 200ms · ease",
        zh: "所有属性 · 200 毫秒 · ease",
      }),
      note: t({
        en: "Under reduced motion it keeps only colour, background colour and opacity.",
        zh: "减弱动效时只保留文字颜色、背景色与不透明度。",
      }),
    },
    {
      term: "transition.shadow",
      value: t({
        en: "Box shadow · 200ms · ease",
        zh: "box-shadow · 200 毫秒 · ease",
      }),
      note: t({
        en: "Kept under reduced motion.",
        zh: "减弱动效时保留。",
      }),
    },
    {
      term: "transition.scrollbarColor",
      value: t({
        en: "Scrollbar colour · 200ms · ease-out",
        zh: "滚动条颜色 · 200 毫秒 · ease-out",
      }),
      note: t({
        en: "Pairs with scrollbar.autoHide from the layout primitive. Only Chromium animates it; other browsers and reduced motion swap at once.",
        zh: "与 layout 原语中的 scrollbar.autoHide 搭配。只有 Chromium 会为其做动画；其他浏览器以及减弱动效时立即切换。",
      }),
    },
    {
      term: "transition.none",
      value: t({ en: "No transition", zh: "无过渡" }),
      note: t({
        en: "Turns off a transition that another style set.",
        zh: "关闭由其他样式设置的过渡。",
      }),
    },
    {
      term: "animate.fadeIn · animate.fadeOut",
      value: t({
        en: "Opacity on mount · 200ms · ease",
        zh: "挂载时的不透明度 · 200 毫秒 · ease",
      }),
      note: t({
        en: "Kept under reduced motion. fadeOut does not hold its end state, so add animationFillMode: forwards or remove the element when it ends.",
        zh: "减弱动效时保留。fadeOut 不会停在结束状态，因此请加上 animationFillMode: forwards，或在结束时移除该元素。",
      }),
    },
    {
      term: "animate.slideUp · animate.slideDown",
      value: t({
        en: "Arrives from below or above, by its own height · 300ms · entrance",
        zh: "从下方或上方移入，距离为自身高度 · 300 毫秒 · entrance",
      }),
      note: t({
        en: "Removed under reduced motion: the element appears in place. Clip the parent, or the element is visible outside it while it travels.",
        zh: "减弱动效时移除：元素直接在原位出现。请裁切父元素，否则元素在移动途中会露在父元素之外。",
      }),
    },
    {
      term: "animate.expand · animate.collapse",
      value: t({
        en: "Grid rows from 0fr to 1fr, or back · 300ms · ease-out",
        zh: "网格行从 0fr 到 1fr，或反向 · 300 毫秒 · ease-out",
      }),
      note: t({
        en: "Not handled under reduced motion. The preset sets display: grid; put the content in one child with minBlockSize: 0 and overflow: hidden.",
        zh: "减弱动效时未作处理。该预设会设置 display: grid；把内容放进一个设有 minBlockSize: 0 与 overflow: hidden 的子元素中。",
      }),
    },
    {
      term: "animate.pulse · animate.bounce",
      value: t({
        en: "Endless loops · 2000ms and 1400ms",
        zh: "无限循环 · 2000 毫秒与 1400 毫秒",
      }),
      note: t({
        en: "Stopped under reduced motion. They do not read motionTokens.playState.",
        zh: "减弱动效时停止。它们不读取 motionTokens.playState。",
      }),
    },
  ];

  const components = [
    {
      term: "Button · AnchorButton",
      value: t({
        en: "Press: easing.easeOut, 150ms · release: 300ms",
        zh: "按下：easing.easeOut，150 毫秒 · 松开：300 毫秒",
      }),
      note: t({
        en: "Grows to 1.05 and leans up to 4px towards the pointer. Reduced motion keeps only the background change.",
        zh: "放大到 1.05，并向指针方向偏移最多 4px。减弱动效时只保留背景变化。",
      }),
    },
    {
      term: "SegmentedControl",
      value: t({ en: "easing.spring, 300ms", zh: "easing.spring，300 毫秒" }),
      note: t({
        en: "The indicator springs to the selected option. Reduced motion moves it at once.",
        zh: "指示块以弹簧曲线移到选中项。减弱动效时立即移过去。",
      }),
    },
    {
      term: "MenuButton",
      value: t({
        en: "Open: easing.spring, 500ms · close: easing.entrance, 300ms",
        zh: "打开：easing.spring，500 毫秒 · 关闭：easing.entrance，300 毫秒",
      }),
      note: t({
        en: "The surface grows out of the trigger and shrinks back into it. Reduced motion cross-fades it in place over 150ms.",
        zh: "弹层从触发按钮长出，再缩回其中。减弱动效时在原位以 150 毫秒交叉淡入淡出。",
      }),
    },
    {
      term: "Popover",
      value: t({
        en: "easing.entrance, 150ms",
        zh: "easing.entrance，150 毫秒",
      }),
      note: t({
        en: "Fades in from 0.98 scale. Reduced motion shows it at once.",
        zh: "从 0.98 的缩放淡入。减弱动效时直接出现。",
      }),
    },
    {
      term: "SidebarLayout",
      value: t({
        en: "easing.entrance, 300ms",
        zh: "easing.entrance，300 毫秒",
      }),
      note: t({
        en: "The drawer slides in over a fading scrim. Reduced motion fades both over 150ms.",
        zh: "抽屉在渐显的遮罩上滑入。减弱动效时两者都以 150 毫秒淡入淡出。",
      }),
    },
    {
      term: "Switch",
      value: t({ en: "easing.ease, 200ms", zh: "easing.ease，200 毫秒" }),
      note: t({
        en: "The thumb slides across. Reduced motion moves it at once.",
        zh: "滑块滑到另一侧。减弱动效时立即移过去。",
      }),
    },
    {
      term: "Slider",
      value: t({ en: "easing.easeOut, 150ms", zh: "easing.easeOut，150 毫秒" }),
      note: t({
        en: "The thumb grows to 1.12 on hover. Reduced motion grows it at once.",
        zh: "悬停时滑块放大到 1.12。减弱动效时立即放大。",
      }),
    },
    {
      term: "Progress",
      value: t({ en: "easing.easeOut, 300ms", zh: "easing.easeOut，300 毫秒" }),
      note: t({
        en: "The bar grows to the new value. Reduced motion jumps to it.",
        zh: "进度条增长到新数值。减弱动效时直接跳到该值。",
      }),
    },
    {
      term: "Spinner",
      value: t({ en: "easing.linear, 800ms", zh: "easing.linear，800 毫秒" }),
      note: t({
        en: "Turns without end. Reduced motion swaps the turn for a slow opacity pulse, 1600ms, so it still reads as busy.",
        zh: "持续旋转。减弱动效时改为 1600 毫秒的缓慢明暗变化，使其仍能表示正在忙。",
      }),
    },
    {
      term: "Skeleton",
      value: t({ en: "easing.pulse, 2000ms", zh: "easing.pulse，2000 毫秒" }),
      note: t({
        en: "Pulses without end. Reduced motion holds it still.",
        zh: "持续明暗变化。减弱动效时保持静止。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Start from a preset", zh: "从预设开始" })}
        lead={t({
          en: "Components animate themselves, so you write motion only for your own elements. Compose a preset onto the element. A preset sets the transition or the animation; the change of state is your own style.",
          zh: "组件会自行处理动效，因此你只需为自己的元素编写动效。把预设组合到元素上即可。预设只设定过渡或动画，状态变化本身由你自己的样式完成。",
        })}
      >
        <UsageSnippet
          code={`import { animate, transition } from "@tuja/ui/primitives/motion.stylex";

<li css={[transition.colors, styles.row, isActive && styles.rowActive]}>…</li>
<div css={animate.fadeIn}>…</div>`}
        />
        <GuideList items={presets} />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Write your own with the constants",
          zh: "用常量编写自己的动效",
        })}
        lead={t({
          en: "When no preset covers the change, build the transition from duration and easing. They are StyleX constants: the compiler writes each value into your CSS, so a theme cannot override them and nothing changes them at runtime.",
          zh: "没有预设能覆盖某个变化时，用 duration 与 easing 自行组合过渡。它们是 StyleX 常量：编译器会把每个值直接写进你的 CSS，因此主题无法覆盖它们，运行时也无法改变。",
        })}
      >
        <UsageSnippet
          code={`import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";

const styles = stylex.create({
  indicator: {
    transition: {
      default: \`transform \${duration._300} \${easing.spring}\`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});`}
        />
        <GuideNote>
          {t({
            en: "75ms to 500ms is the range the transitions use; 800ms and up is for loops. easing.spring is a linear() curve, and a browser without linear() ignores the whole declaration. easing.springFallback is a cubic-bezier that comes close, for those browsers.",
            zh: "过渡使用 75 至 500 毫秒；800 毫秒及以上用于循环。easing.spring 是一条 linear() 曲线，不支持 linear() 的浏览器会忽略整条声明。easing.springFallback 是一条与之接近的 cubic-bezier，供这些浏览器使用。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Match the component beside it",
          zh: "与相邻的组件保持一致",
        })}
        lead={t({
          en: "The components do not all share one curve. When your motion sits next to one of them, take its timing from this list.",
          zh: "各组件并不共用同一条曲线。当你的动效紧挨着某个组件时，从下表取用它的时间设置。",
        })}
      >
        <GuideList items={components} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Reduced motion", zh: "减弱动效" })}
        lead={t({
          en: "Under prefers-reduced-motion, the components and presets remove movement and keep changes of colour and opacity. Loops stop, except Spinner. Your own motion needs the same branch, written in the style that defines the motion, so every element that composes it gets the branch too.",
          zh: "在 prefers-reduced-motion 下，组件与预设会去掉移动，保留颜色与不透明度的变化。循环会停止，Spinner 除外。你自己的动效也需要同样的分支，并写在定义该动效的样式中，这样每个组合它的元素都会一并得到这个分支。",
        })}
      >
        <ReducedMotionSpecimen />
        <UsageSnippet
          code={`import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { getScrollBehavior } from "@tuja/ui/utils/get-scroll-behavior";
import {
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
} from "@tuja/ui/utils/prefers-reduced-motion";

// In a style: branch where the motion is defined.
const styles = stylex.create({
  panel: {
    animationName: {
      default: slideIn,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});

// In an effect or a handler: read the setting at the time of use.
element.scrollIntoView({ behavior: getScrollBehavior() });
if (!prefersReducedMotion()) element.animate(keyframes, options);

// To render from the setting: subscribe, so a change re-renders.
window.matchMedia(REDUCED_MOTION_QUERY).addEventListener("change", update);`}
        />
        <GuideNote>
          {t({
            en: "animate.expand and animate.collapse have no reduced-motion branch. If you use them, add animationName: none under motionConstants.REDUCED_MOTION in your own style.",
            zh: "animate.expand 与 animate.collapse 没有减弱动效分支。若使用它们，请在你自己的样式中，于 motionConstants.REDUCED_MOTION 下加上 animationName: none。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Hold a loop still", zh: "让循环静止" })}
        lead={t({
          en: "Spinner and Skeleton loop on an inner element that css cannot reach, so they read their play state from motionTokens.playState. It is a custom property, so it inherits: set it once on an ancestor and every loop inside pauses. Hover or focus the tile.",
          zh: "Spinner 与 Skeleton 在 css 无法触及的内部元素上循环，因此它们从 motionTokens.playState 读取播放状态。它是一个自定义属性，会被继承：在祖先元素上设置一次，其中所有循环都会暂停。将指针悬停在方块上，或让它获得焦点。",
        })}
      >
        <Specimen
          caption={t({
            en: "Held until hover or focus",
            zh: "悬停或聚焦前保持静止",
          })}
        >
          <MotionHoldBackSpecimen />
        </Specimen>
        <UsageSnippet
          code={`import { motionTokens } from "@tuja/ui/primitives/motion.stylex";

const styles = stylex.create({
  held: {
    [motionTokens.playState]: {
      default: "running",
      "@media (hover: hover)": { default: "paused", ":hover": "running" },
    },
  },
  // animate.pulse and animate.bounce do not read the token.
  followsHold: { animationPlayState: motionTokens.playState },
});`}
        />
        <GuideNote>
          {t({
            en: "Leave the loop running where the device cannot hover, or nothing could ever start it.",
            zh: "在无法悬停的设备上让循环保持运行，否则它永远无法开始。",
          })}
        </GuideNote>
      </GuideSection>

      <Showcase label={t({ en: "Transition presets", zh: "过渡预设" })}>
        <ShowcaseHelper>
          {t({
            en: "Hover a tile. Each settles in 200ms.",
            zh: "将指针悬停在方块上。每个都在 200 毫秒内完成。",
          })}
        </ShowcaseHelper>
        <SpecimenGrid>
          <Specimen caption="transition.colors">
            <div
              css={[
                typeRole.caption,
                corner.radius_2,
                styles.tokenTile,
                transition.colors,
                styles.hoverColors,
              ]}
            >
              {t({ en: "Hover", zh: "悬停" })}
            </div>
          </Specimen>
          <Specimen caption="transition.opacity">
            <div
              css={[
                typeRole.caption,
                corner.radius_2,
                styles.tokenTile,
                transition.opacity,
                styles.hoverOpacity,
              ]}
            >
              {t({ en: "Hover", zh: "悬停" })}
            </div>
          </Specimen>
          <Specimen caption="transition.transform">
            <div
              css={[
                typeRole.caption,
                corner.radius_2,
                styles.tokenTile,
                transition.transform,
                styles.hoverTransform,
              ]}
            >
              {t({ en: "Hover", zh: "悬停" })}
            </div>
          </Specimen>
          <Specimen caption="transition.all">
            <div
              css={[
                typeRole.caption,
                corner.radius_2,
                styles.tokenTile,
                transition.all,
                styles.hoverAll,
              ]}
            >
              {t({ en: "Hover", zh: "悬停" })}
            </div>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <MotionKeyframePresets />

      <Showcase label={t({ en: "Durations", zh: "时长" })}>
        <ShowcaseHelper>
          {t({
            en: "Each bar is drawn in proportion to its length.",
            zh: "每条长度与其时长成正比。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {DURATIONS.map((step) => (
            <SpecCard
              key={step.token}
              token={step.token}
              meta={`${step.ms.toString()}ms`}
            >
              <div css={[corner.radius_round, styles.track]}>
                <span
                  css={[
                    corner.radius_round,
                    styles.trackFill,
                    styles.trackFillWidth(
                      `${((step.ms / MAX_MS) * 100).toFixed(1)}%`,
                    ),
                  ]}
                />
              </div>
            </SpecCard>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Easings", zh: "缓动" })}>
        <ShowcaseHelper>
          {t({
            en: "Progress against time. spring and springFallback leave the box because they overshoot. entrance starts fast and slows for a long time with no overshoot; the slides, Popover and SidebarLayout use it for things that arrive. pulse is for loops.",
            zh: "纵轴为进度，横轴为时间。spring 与 springFallback 会越出方框，因为它们会越过目标。entrance 起步快、减速时间长，不越过目标；滑入预设、Popover 与 SidebarLayout 用它表现进场。pulse 用于循环。",
          })}
        </ShowcaseHelper>
        <div css={styles.grid}>
          {EASINGS.map((step) => (
            <SpecCard key={step.token} token={step.token} meta={step.curve}>
              <svg
                viewBox="0 0 100 100"
                css={styles.curve}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line x1="0" y1="100" x2="100" y2="0" css={styles.curveGuide} />
                <path d={step.path} css={styles.curvePath} />
              </svg>
            </SpecCard>
          ))}
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: rhythm.item,
  },
  track: {
    blockSize: space._1,
    backgroundColor: color.bgControlPressed,
    overflow: "hidden",
  },
  trackFill: {
    display: "block",
    blockSize: "100%",
    backgroundColor: color.bgAccent,
  },
  trackFillWidth: (inlineSize: string) => ({
    inlineSize,
  }),
  curve: {
    inlineSize: "100%",
    blockSize: "72px",
    overflow: "visible",
  },
  curveGuide: {
    stroke: color.border,
    strokeWidth: 1,
    strokeDasharray: "3 4",
    vectorEffect: "non-scaling-stroke",
  },
  curvePath: {
    fill: "none",
    stroke: color.bgAccent,
    strokeWidth: 2,
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke",
  },
  tokenTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    minBlockSize: "72px",
    paddingBlock: space._2,
    paddingInline: space._2,
    textAlign: "center",
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    color: color.fgMuted,
  },
  hoverColors: {
    backgroundColor: {
      default: color.bgSurfaceRaised,
      ":hover": color.bgAccent,
    },
    color: { default: color.fgMuted, ":hover": color.fgOnAccent },
  },
  hoverOpacity: {
    opacity: { default: 1, ":hover": 0.35 },
  },
  hoverTransform: {
    transform: { default: "scale(1)", ":hover": "scale(1.08)" },
  },
  hoverAll: {
    backgroundColor: {
      default: color.bgSurfaceRaised,
      ":hover": color.bgAccentSubtle,
    },
    transform: { default: "translateY(0)", ":hover": "translateY(-4px)" },
    color: { default: color.fgMuted, ":hover": color.fgAccent },
  },
});
