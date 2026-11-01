import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { MotionEngineSpecimen } from "./motion-engine-specimen.tsx";
import { MotionTransitionPresets } from "./motion-transition-presets.tsx";
import { ReducedMotionSpecimen } from "./reduced-motion-specimen.tsx";

export function MotionShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Change a state with a preset.",
          zh: "用预设改变状态。",
        })}
        lead={t({
          en: "Compose a transition preset, and your own style makes the change. The preset decides only what animates.",
          zh: "组合一个过渡预设，变化本身由你自己的样式完成。预设只决定哪些属性有动画。",
        })}
      >
        <MotionTransitionPresets />
        <GuideNote>
          {t({
            en: "Give easing.spring 4 times what a move needs: it is 95% there at about a quarter.",
            zh: "easing.spring 的时长请设为动作所需的四倍：它在约四分之一处就已走完 95%。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "animate.fadeOut does not hold its end state. Add animationFillMode: forwards.",
            zh: "animate.fadeOut 不会停在结束状态，请加上 animationFillMode: forwards。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Let people interrupt the motion.",
          zh: "让人能随时打断动效。",
        })}
        lead={t({
          en: "When a motion can be interrupted or follows a gesture, use the motion engine: a new target starts from where the value is, at its speed. Pick a role, then drag the puck and let go.",
          zh: "动效可被打断或跟随手势时，请使用动效引擎：新的目标会从值当前的位置、以当前速度开始。选一个角色，再拖动圆块后松手。",
        })}
      >
        <MotionEngineSpecimen />
        <GuideNote>
          {t({
            en: "Every role is one spring with its own mass: heavier is slower, with the same bounce.",
            zh: "每个角色都是同一个弹簧配上自己的质量：越重越慢，回弹相同。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "For a new layout: captureLayout, change the layout, then playLayout.",
            zh: "换布局时：先 captureLayout，再改变布局，然后调用 playLayout。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Drop the movement under reduced motion.",
          zh: "减弱动效时去掉移动。",
        })}
        lead={t({
          en: "The components and presets drop movement and keep changes of colour and opacity. Give your own motion a motionConstants.REDUCED_MOTION branch in the style that defines it.",
          zh: "组件与预设会去掉移动，保留颜色与不透明度的变化。请在定义动效的样式中，为你自己的动效加上 motionConstants.REDUCED_MOTION 分支。",
        })}
      >
        <ReducedMotionSpecimen />
        <GuideNote>
          {t({
            en: "animate.expand and .collapse have no reduced-motion branch. Add your own.",
            zh: "animate.expand 与 .collapse 没有减弱动效分支，请自行加上。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Under reduced motion, the engine's to() snaps, or takes your reduced tween.",
            zh: "减弱动效时，引擎的 to() 会直接跳到目标，或改用你通过 reduced 指定的补间。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Pause each Spinner and Skeleton inside an element with motionTokens.playState.",
            zh: "用 motionTokens.playState 暂停某个元素内的每个 Spinner 与 Skeleton。",
          })}
        </GuideNote>
      </GuideSection>
    </>
  );
}
