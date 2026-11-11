import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import {
  animate,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";

export function MotionSection() {
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
      meta: "transform 500ms · reduced:none",
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
      meta: "translateY 500ms · reduced:off",
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
          en: "Transition and animation presets. Compose them onto your own element instead of writing keyframes by hand. The Motion page says what each one does under reduced motion, and lists the duration and easing constants.",
          zh: "过渡与动画预设。将它们组合到你自己的元素上，而不必手写关键帧。动效页说明了每个预设在减弱动效下的表现，并列出时长与缓动常量。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "transition.colors — hover",
            zh: "transition.colors —— 悬停",
          })}
        >
          <div
            css={[
              typeRole.label,
              transition.colors,
              corner.radius_2,
              styles.hoverTile,
            ]}
          >
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

const styles = stylex.create({
  // Motion specimens
  hoverTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    paddingBlock: space._3,
    color: {
      default: color.mutedForeground,
      ":hover": {
        default: null,
        [pointer.canHover]: color.primaryForeground,
      },
    },
    backgroundColor: {
      default: color.card,
      ":hover": { default: null, [pointer.canHover]: color.primary },
    },
  },
  dotRow: {
    gap: rhythm.tight,
  },
  dot: {
    inlineSize: "12px",
    blockSize: "12px",
    backgroundColor: color.primary,
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
    gap: rhythm.tight,
    inlineSize: "100%",
  },
  skeletonBar: {
    blockSize: "12px",
    inlineSize: "100%",
    backgroundColor: color.accent,
  },
  skeletonBarShort: {
    blockSize: "12px",
    inlineSize: "60%",
    backgroundColor: color.accent,
  },
  // Pauses infinite animations for viewers who prefer reduced motion.
  reduceMotionPause: {
    animationPlayState: {
      default: "running",
      [motionConstants.REDUCED_MOTION]: "paused",
    },
  },
});
