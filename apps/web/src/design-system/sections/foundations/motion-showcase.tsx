import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { springRoles, systemSpring } from "@tuja/ui/motion/spring-roles";
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
import { MotionEngineSpecimen } from "./motion-engine-specimen.tsx";
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

function bezierOf(token: string) {
  return token
    .slice(token.indexOf("(") + 1, -1)
    .split(",")
    .map((point) => Number(point));
}

/** The first two and the last two stops of a `linear()` curve. */
function shortLinear(token: string) {
  const stops = token.slice(token.indexOf("(") + 1, -1).split(", ");
  return `linear(${stops.slice(0, 2).join(", ")}, … ${stops.slice(-2).join(", ")})`;
}

const EASINGS = [
  {
    token: "easing.spring",
    curve: shortLinear(easing.spring),
    path: linearPath(easing.spring),
  },
  {
    token: "easing.springFallback",
    curve: easing.springFallback,
    path: bezierPath(bezierOf(easing.springFallback)),
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
        en: "Transform · 500ms · spring",
        zh: "transform · 500 毫秒 · spring",
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
        en: "Arrives from below or above, by its own height · 500ms · spring",
        zh: "从下方或上方移入，距离为自身高度 · 500 毫秒 · spring",
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

  const engineComponents = [
    {
      term: "NavigationSplitView",
      value: t({
        en: "Engine · stackPush, move, flight, columnPush, fold",
        zh: "引擎 · stackPush、move、flight、columnPush、fold",
      }),
      note: t({
        en: "A column or a page pushes in, the sidebar folds to the Collapsed sidebar, and each Shared element flies to its new form. A navigation during a push turns it from where it is. Reduced motion cross-fades over 170ms.",
        zh: "一栏或一页推入，侧边栏折叠为收起侧栏，每个共享元素飞向它的新形态。推入途中再次导航，会从当前位置掉头。减弱动效时以 170 毫秒交叉淡入淡出。",
      }),
    },
    {
      term: "Sheet",
      value: t({
        en: "Engine · surface, lift",
        zh: "引擎 · surface、lift",
      }),
      note: t({
        en: "Below md the card slides up from the screen edge, or lifts out of the row that opened it; from md up it rises a little as it grows. A drag that lets go keeps its speed. Reduced motion fades it in place over 200ms.",
        zh: "md 以下，卡片从屏幕边缘滑上来，或从打开它的那一行中升起；md 及以上，它在变大的同时略微升起。拖动后松手，卡片保持松手时的速度。减弱动效时在原位以 200 毫秒淡入淡出。",
      }),
    },
    {
      term: "MenuButton",
      value: t({ en: "Engine · surface", zh: "引擎 · surface" }),
      note: t({
        en: "The surface grows out of the trigger and shrinks back into it. A toggle during the morph turns it from where it is. Reduced motion cross-fades it in place over 150ms.",
        zh: "弹层从触发按钮长出，再缩回其中。变形途中再次切换，会从当前位置掉头。减弱动效时在原位以 150 毫秒交叉淡入淡出。",
      }),
    },
    {
      term: "SidebarLayout",
      value: t({ en: "Engine · surface", zh: "引擎 · surface" }),
      note: t({
        en: "Below md the drawer slides in over a fading scrim, and a toggle during the slide turns it. Reduced motion fades both over 150ms.",
        zh: "md 以下，抽屉在渐显的遮罩上滑入；滑动途中再次切换会让它掉头。减弱动效时两者都以 150 毫秒淡入淡出。",
      }),
    },
    {
      term: "TabView",
      value: t({ en: "Engine · surface", zh: "引擎 · surface" }),
      note: t({
        en: "The new screen fades in as it rises into place. Reduced motion shows it at once.",
        zh: "新屏幕一边淡入一边升到位。减弱动效时直接显示。",
      }),
    },
    {
      term: "CodeBlock",
      value: t({ en: "Engine · surface", zh: "引擎 · surface" }),
      note: t({
        en: "When the source changes, the parts that stay move to their new place, new parts rise in, and parts that go fade out over 200ms. Reduced motion fades new parts in over 150ms.",
        zh: "源码变化时，保留的部分移到新位置，新部分升入，离开的部分以 200 毫秒淡出。减弱动效时新部分以 150 毫秒淡入。",
      }),
    },
  ];

  const cssComponents = [
    {
      term: "Button · AnchorButton",
      value: t({
        en: "Press: easing.spring, 500ms · release: 1000ms",
        zh: "按下：easing.spring，500 毫秒 · 松开：1000 毫秒",
      }),
      note: t({
        en: "Grows to 1.05 and leans up to 4px towards the pointer. Reduced motion keeps only the background change.",
        zh: "放大到 1.05，并向指针方向偏移最多 4px。减弱动效时只保留背景变化。",
      }),
    },
    {
      term: "SegmentedControl · TabBar",
      value: t({ en: "easing.spring, 300ms", zh: "easing.spring，300 毫秒" }),
      note: t({
        en: "The plain indicator springs to the selected option. The liquid effect pours it there instead, as water that flows on for about 0.8 s after it arrives and then sets in the segment's shape. Reduced motion moves it at once, or crossfades it with the effect.",
        zh: "普通指示块以弹簧曲线移到选中项。液态效果则让它化作水涌过去，到位后继续流动约 0.8 秒，再按分段的形状凝固。减弱动效时立即移过去；有效果时以交叉淡入淡出到位。",
      }),
    },
    {
      term: "Switch",
      value: t({ en: "easing.spring, 500ms", zh: "easing.spring，500 毫秒" }),
      note: t({
        en: "The plain thumb springs across. The liquid effect pours it across instead, as a drop of water that flows on for about 0.8 s after it arrives and then sets at the other end. Reduced motion moves it at once, or crossfades it with the effect.",
        zh: "普通滑块以弹簧曲线移到另一侧。液态效果则让它化作一滴水涌到另一侧，到位后继续流动约 0.8 秒，再凝固。减弱动效时立即移过去；有效果时以交叉淡入淡出到位。",
      }),
    },
    {
      term: "Slider",
      value: t({ en: "easing.spring, 500ms", zh: "easing.spring，500 毫秒" }),
      note: t({
        en: "The thumb grows to 1.12 on hover. Reduced motion grows it at once.",
        zh: "悬停时滑块放大到 1.12。减弱动效时立即放大。",
      }),
    },
    {
      term: "Progress",
      value: t({ en: "easing.spring, 1000ms", zh: "easing.spring，1000 毫秒" }),
      note: t({
        en: "The bar grows to the new value. Reduced motion jumps to it.",
        zh: "进度条增长到新数值。减弱动效时直接跳到该值。",
      }),
    },
    {
      term: "Disclosure",
      value: t({
        en: "transition.transform: easing.spring, 500ms",
        zh: "transition.transform：easing.spring，500 毫秒",
      }),
      note: t({
        en: "The caret turns as the panel opens and closes. Reduced motion turns it at once.",
        zh: "面板展开与收起时，箭头随之旋转。减弱动效时立即转到位。",
      }),
    },
    {
      term: "Popover",
      value: t({ en: "easing.spring, 300ms", zh: "easing.spring，300 毫秒" }),
      note: t({
        en: "Fades in from 0.98 scale. Reduced motion shows it at once.",
        zh: "从 0.98 的缩放淡入。减弱动效时直接出现。",
      }),
    },
    {
      term: "Toast",
      value: t({ en: "easing.spring, 500ms", zh: "easing.spring，500 毫秒" }),
      note: t({
        en: "Arrives with a spring; a browser without linear() takes easing.springFallback. Reduced motion fades it in over 200ms.",
        zh: "以弹簧曲线进场；不支持 linear() 的浏览器改用 easing.springFallback。减弱动效时以 200 毫秒淡入。",
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

  const model = [
    {
      term: "systemSpring",
      value: `stiffness ${systemSpring.stiffness.toString()} · dampingRatio ${systemSpring.dampingRatio.toString()}`,
      note: t({
        en: "One stiffness and one damping ratio for every motion in the system. The damping ratio sets the overshoot, so every motion has the same bounce.",
        zh: "整个系统的所有动效共用一个刚度和一个阻尼比。阻尼比决定越过目标的幅度，因此每个动效都有同样的回弹。",
      }),
    },
    {
      term: "springRoles · springOf",
      value: t({
        en: "A mass for each thing that moves",
        zh: "每种移动的东西各有一个质量",
      }),
      note: t({
        en: "A heavier role moves slower, with the same bounce. springOf(role) gives the spring of a role on the system spring.",
        zh: "角色越重，移动越慢，回弹却不变。springOf(role) 给出某个角色在系统弹簧上的弹簧。",
      }),
    },
    {
      term: t({ en: "No duration", zh: "没有时长" }),
      note: t({
        en: "A spring has no duration. How long a motion takes comes from the spring, the distance and the start velocity.",
        zh: "弹簧没有时长。一个动效需要多久，取决于弹簧、距离与初速度。",
      }),
    },
    {
      term: t({ en: "An interrupt keeps its speed", zh: "打断时保持速度" }),
      note: t({
        en: "The engine solves the spring exactly, so it knows where a value is and how fast it moves at any time. A to() during a motion starts from there at that speed, and the motion turns without a jolt. A drag writes each move with set(x, { velocity }), and the to() at its release keeps that speed.",
        zh: "引擎精确求解弹簧，因此任何时刻都知道值在哪里、移动多快。动效途中调用 to()，会从该处以该速度开始，动效平滑掉头，不会突兀。拖动时用 set(x, { velocity }) 写入每一步，松手时的 to() 会保持这个速度。",
      }),
    },
    {
      term: t({ en: "On the compositor", zh: "在合成器上运行" }),
      note: t({
        en: "The engine samples the spring into keyframes and plays them as Web Animations, so a busy main thread does not stop a motion.",
        zh: "引擎把弹簧采样为关键帧，并以 Web Animations 播放，因此主线程繁忙时动效也不会停顿。",
      }),
    },
  ];

  const roleNotes: Record<keyof typeof springRoles, string> = {
    surface: t({
      en: "A popover, a menu, a toast, a Sheet's card, a screen that rises, and a control.",
      zh: "弹出层、菜单、Toast、Sheet 的卡片、升起的屏幕，以及控件。",
    }),
    switchFill: t({
      en: "The on fill as it rises through a Switch's track.",
      zh: "开启时的填充色在 Switch 轨道中升起时。",
    }),
    stackPush: t({
      en: "A page that a Navigation split view pushes over the one before it.",
      zh: "导航分栏视图推到上一页之上的一页。",
    }),
    move: t({
      en: "An element that moves to its new place in the layout. playLayout takes it when you give no spring.",
      zh: "移到布局中新位置的元素。未指定弹簧时，playLayout 使用它。",
    }),
    flight: t({
      en: "A Shared element as it flies to its new form.",
      zh: "共享元素飞向新形态时。",
    }),
    columnPush: t({
      en: "A column that a Navigation split view pushes in beside the others.",
      zh: "导航分栏视图在其他栏旁推入的一栏。",
    }),
    lift: t({
      en: "A Sheet's card as it grows out of a row and shrinks back into it.",
      zh: "Sheet 的卡片从某一行中长出、再缩回其中时。",
    }),
    fold: t({
      en: "The sidebar of a Navigation split view as it folds to the Collapsed sidebar or opens.",
      zh: "导航分栏视图的侧边栏折叠为收起侧栏或展开时。",
    }),
    aim: t({
      en: "The beam of a Black hole as it turns to its aim.",
      zh: "黑洞的光束转向目标时。",
    }),
  };
  const notes = new Map(Object.entries(roleNotes));
  const roles = Object.entries(springRoles).map(([role, { mass }]) => ({
    term: `springRoles.${role}`,
    value: `mass ${mass.toString()}`,
    note: notes.get(role) ?? "",
  }));

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
            en: "The transitions use 75ms to 1000ms; 800ms and up is for loops. A movement in CSS takes easing.spring: the system spring of the motion engine at mass 1, sampled into a linear() curve over 500ms. At 500ms, a transition moves as the surface role does. A longer or shorter duration changes the speed as a different mass does: the bounce stays the same. The curve is at 95% at approximately a quarter of the duration, so use a duration that is approximately four times the time in which the movement must look complete. A browser without linear() ignores the whole declaration; easing.springFallback is a cubic-bezier that comes close, for those browsers.",
            zh: "过渡使用 75 至 1000 毫秒；800 毫秒及以上用于循环。CSS 中的移动使用 easing.spring：它是动效引擎的系统弹簧在质量为 1 时以 500 毫秒采样写成的一条 linear() 曲线。时长为 500 毫秒时，过渡与 surface 角色的移动一致。时长更长或更短，速度就像质量变化时一样变慢或变快，回弹不变。曲线在约四分之一时长处达到 95%，因此请把时长设为移动看起来完成所需时间的约四倍。不支持 linear() 的浏览器会忽略整条声明；easing.springFallback 是一条与之接近的 cubic-bezier，供这些浏览器使用。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Motion engine", zh: "动效引擎" })}
        lead={t({
          en: "One engine drives every motion that can be interrupted, follows a gesture, or is measured from the layout. Use it for that kind of motion. A simple change of state, such as a hover, a press or a selection, stays a CSS transition.",
          zh: "一个引擎驱动所有可被打断、跟随手势或由布局测量而来的动效。这类动效请用引擎。简单的状态变化，例如悬停、按下或选中，仍用 CSS 过渡。",
        })}
      >
        <GuideList items={model} />
        <MotionEngineSpecimen />
        <UsageSnippet
          code={`import { px } from "@tuja/ui/motion/px";
import { springOf, springRoles } from "@tuja/ui/motion/spring-roles";
import { useBinding } from "@tuja/ui/motion/use-binding";
import {
  useMotionEngine,
  useMotionValue,
} from "@tuja/ui/motion/use-motion-engine";

const engine = useMotionEngine();
const x = useMotionValue(engine, 0, {
  spring: springOf(springRoles.move),
  precision: 0.5,
});
useBinding(ref, x, {
  pose: (at) => ({ transform: \`translateX(\${px(at)})\` }),
});

// While a drag moves it: under the finger, with the speed of the drag.
x.set(dragX, { velocity: dragVelocity });
// On release: spring to the end at that speed. A to() during a motion
// turns it from where it is, at the speed it has.
x.to(end);`}
        />
        <GuideNote>
          {t({
            en: "Outside React, createMotionEngine, createMotionValue and bind do the same. To move elements to their new place in the layout, take their boxes with captureLayout, change the layout, then call playLayout.",
            zh: "在 React 之外，createMotionEngine、createMotionValue 与 bind 起同样的作用。要把元素移到布局中的新位置，先用 captureLayout 记下它们的方框，再改变布局，然后调用 playLayout。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Give it a role", zh: "为它指定角色" })}
        lead={t({
          en: "The mass belongs to what moves. When your element moves as one of these does, give it the same role, and it moves at the same pace.",
          zh: "质量取决于移动的东西。当你的元素与下列某项移动方式相同时，给它同一个角色，它就会以相同的节奏移动。",
        })}
      >
        <GuideList items={roles} />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Match the component beside it",
          zh: "与相邻的组件保持一致",
        })}
        lead={t({
          en: "The components share one spring. When your motion sits next to one of them, take what it takes. These move on the motion engine, each with a role.",
          zh: "各组件共用同一个弹簧。当你的动效紧挨着某个组件时，取用它所用的设置。下列组件在动效引擎上运行，各有其角色。",
        })}
      >
        <GuideList items={engineComponents} />
        <GuideNote>
          {t({
            en: "These move in CSS, with a duration and easing.spring for a movement.",
            zh: "下列组件在 CSS 中运行，移动时使用某个时长与 easing.spring。",
          })}
        </GuideNote>
        <GuideList items={cssComponents} />
      </GuideSection>

      <GuideSection
        title={t({ en: "Reduced motion", zh: "减弱动效" })}
        lead={t({
          en: "Under prefers-reduced-motion, the components and presets remove movement and keep changes of colour and opacity. Loops stop, except Spinner. On the motion engine, to() snaps to its target, or takes the tween you give as reduced, such as a short fade. Your own CSS motion needs the same branch, written in the style that defines the motion, so every element that composes it gets the branch too.",
          zh: "在 prefers-reduced-motion 下，组件与预设会去掉移动，保留颜色与不透明度的变化。循环会停止，Spinner 除外。在动效引擎上，to() 会直接跳到目标，或改用你通过 reduced 指定的补间，例如一次短暂的淡入淡出。你自己的 CSS 动效也需要同样的分支，并写在定义该动效的样式中，这样每个组合它的元素都会一并得到这个分支。",
        })}
      >
        <ReducedMotionSpecimen />
        <UsageSnippet
          code={`import { prefersReducedMotion } from "@tuja/ui/motion/prefers-reduced-motion";
import { useReducedMotion } from "@tuja/ui/motion/use-reduced-motion";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { getScrollBehavior } from "@tuja/ui/utils/get-scroll-behavior";

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

// On the engine: snap, or a short fade in place of the slide.
x.to(end, { reduced: { duration: 0.15 } });

// To render from the setting: a change re-renders.
const reduced = useReducedMotion();`}
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
          code={`import { pointer } from "@tuja/ui/breakpoints.stylex";
import { motionTokens } from "@tuja/ui/primitives/motion.stylex";

const styles = stylex.create({
  held: {
    [motionTokens.playState]: {
      default: "running",
      [pointer.canHover]: { default: "paused", ":hover": "running" },
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
            en: "Hover a tile. Each runs for 200ms, and transition.transform for 500ms.",
            zh: "将指针悬停在方块上。每个持续 200 毫秒，transition.transform 持续 500 毫秒。",
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
            en: "Progress against time. spring is the system spring at mass 1, and it leaves the box because it overshoots; springFallback comes close to it. pulse is for loops.",
            zh: "纵轴为进度，横轴为时间。spring 是质量为 1 时的系统弹簧，它会越过目标，因此越出方框；springFallback 与之接近。pulse 用于循环。",
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
    marginBlockStart: rhythm.tight,
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
    marginBlockStart: rhythm.tight,
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
      ":hover": { default: null, [pointer.canHover]: color.bgAccent },
    },
    color: {
      default: color.fgMuted,
      ":hover": {
        default: null,
        [pointer.canHover]: color.fgOnAccent,
      },
    },
  },
  hoverOpacity: {
    opacity: {
      default: 1,
      ":hover": { default: null, [pointer.canHover]: 0.35 },
    },
  },
  hoverTransform: {
    transform: {
      default: "scale(1)",
      ":hover": { default: null, [pointer.canHover]: "scale(1.08)" },
    },
  },
  hoverAll: {
    backgroundColor: {
      default: color.bgSurfaceRaised,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgAccentSubtle,
      },
    },
    transform: {
      default: "translateY(0)",
      ":hover": {
        default: null,
        [pointer.canHover]: "translateY(-4px)",
      },
    },
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fgAccent },
    },
  },
});
