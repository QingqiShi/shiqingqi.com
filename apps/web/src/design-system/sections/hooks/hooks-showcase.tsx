"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { pressNudgeTokens } from "@tuja/ui/components/button-shared.stylex";
import { Text } from "@tuja/ui/components/text";
import { useControlled } from "@tuja/ui/hooks/use-controlled";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, shadow, space } from "@tuja/ui/tokens.stylex";
import { useRef, useState } from "react";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { hooksSpecimen } from "./hooks-specimen.stylex.ts";
import { UseDialogFocusSection } from "./use-dialog-focus-section.tsx";
import { UsePopoverSection } from "./use-popover-section.tsx";

interface StepperProps {
  value?: number;
  defaultValue?: number;
  onChange?: (next: number) => void;
}

/** A stepper driven by `useControlled` — works both controlled and uncontrolled. */
function StepperControl({
  value: controlled,
  defaultValue = 0,
  onChange,
}: StepperProps) {
  const [value, setValue] = useControlled({ controlled, defaultValue });
  const decLabel = t({ en: "Decrease", zh: "减少" });
  const incLabel = t({ en: "Increase", zh: "增加" });
  const commit = (next: number) => {
    setValue(next);
    onChange?.(next);
  };
  return (
    <div css={[flex.row, corner.radius_round, styles.stepper]}>
      <button
        type="button"
        aria-label={decLabel}
        css={[
          buttonReset.base,
          flex.center,
          corner.radius_round,
          styles.stepBtn,
        ]}
        onClick={() => {
          commit(value - 1);
        }}
      >
        −
      </button>
      <span css={[typeRole.body, styles.stepValue]}>{value}</span>
      <button
        type="button"
        aria-label={incLabel}
        css={[
          buttonReset.base,
          flex.center,
          corner.radius_round,
          styles.stepBtn,
        ]}
        onClick={() => {
          commit(value + 1);
        }}
      >
        +
      </button>
    </div>
  );
}

/** Parent-owned value: the stepper defers to props, proving the controlled path. */
function ControlledStepperSpecimen() {
  const [value, setValue] = useState(2);
  const stateLabel = t({ en: "Parent state", zh: "父组件状态" });
  return (
    <div css={[stack.tight, styles.alignStart]}>
      <StepperControl value={value} onChange={setValue} />
      <Text look="caption" tone="muted">
        {stateLabel}:{" "}
        <span css={[corner.radius_1, styles.readout]}>{value}</span>
      </Text>
    </div>
  );
}

function UseControlledSection() {
  return (
    <Showcase label="useControlled" labelLook="code">
      <ShowcaseHelper>
        {t({
          en: "Give a component both a controlled and an uncontrolled mode from one call. When a `controlled` value is passed it drives the component; otherwise the component keeps its own state from `defaultValue`. Reach for it whenever you build an input-like control.",
          zh: "一次调用即让组件同时拥有受控与非受控两种模式。传入 `controlled` 值时由它驱动组件；否则组件从 `defaultValue` 维护自身状态。构建任何类输入控件时都可使用。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={hooksSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "Uncontrolled — owns its own state",
            zh: "非受控——自行维护状态",
          })}
        >
          <StepperControl defaultValue={0} />
        </Specimen>
        <Specimen
          caption={t({
            en: "Controlled — parent owns the value",
            zh: "受控——由父组件持有值",
          })}
        >
          <ControlledStepperSpecimen />
        </Specimen>
      </SpecimenGrid>
      <UsageSnippet
        code={`import { useControlled } from "@tuja/ui/hooks/use-controlled";

// [value, setValue] = useControlled({ controlled, defaultValue })
function Stepper({ value, defaultValue = 0, onChange }) {
  const [count, setCount] = useControlled({ controlled: value, defaultValue });
  const commit = (next) => { setCount(next); onChange?.(next); };
  // render count, calling commit on +/-
}`}
      />
    </Showcase>
  );
}

/** A plain element wearing the Button press animation via `usePressHandlers`. */
function PressSpecimen() {
  const ref = useRef<HTMLButtonElement>(null);
  const { isPressed, pressedCss, handlers } = usePressHandlers({
    targetRef: ref,
  });
  const label = t({ en: "Press and hold", zh: "按住试试" });
  return (
    <button
      ref={ref}
      type="button"
      {...handlers}
      css={[
        typeRole.label,
        buttonReset.base,
        flex.center,
        corner.radius_2,
        styles.pressTile,
        isPressed && styles.pressTilePressed,
        pressedCss,
      ]}
    >
      {label}
    </button>
  );
}

function UsePressSection() {
  return (
    <Showcase label="usePressHandlers / usePressAnimation" labelLook="code">
      <ShowcaseHelper>
        {t({
          en: "The tactile press from Button — a spring scale, brightness lift, and directional nudge when the pointer drifts off — packaged for any element. `usePressAnimation` is the low-level state machine; `usePressHandlers` layers on click-cancel and the CSS custom properties. Reach for it to make a bespoke control feel like the rest of the system.",
          zh: "把 Button 的触感按压——弹性缩放、亮度提升，以及指针移开时的方向性偏移——封装给任意元素。`usePressAnimation` 是底层状态机；`usePressHandlers` 在其上叠加点击取消与 CSS 自定义属性。让自定义控件拥有与系统一致的手感时使用。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={hooksSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "Press with a pointer or Space/Enter; drag off to see the nudge",
            zh: "用指针或空格/回车按下；拖离可见方向偏移",
          })}
        >
          <PressSpecimen />
        </Specimen>
      </SpecimenGrid>
      <UsageSnippet
        code={`import { useRef } from "react";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";

const ref = useRef(null);
const { isPressed, pressedCss, handlers } = usePressHandlers({
  targetRef: ref,
  onClick,
});

<button ref={ref} {...handlers} css={[isPressed && styles.pressed, pressedCss]} />`}
      />
    </Showcase>
  );
}

type Density = "compact" | "cozy" | "comfortable";

/** A headless radiogroup: roving tabindex + full WAI-ARIA keyboard from the hook. */
function DensityRadioGroup() {
  const [value, setValue] = useState<Density>("cozy");
  const labels: Record<Density, string> = {
    compact: t({ en: "Compact", zh: "紧凑" }),
    cozy: t({ en: "Cozy", zh: "适中" }),
    comfortable: t({ en: "Comfortable", zh: "宽松" }),
  };
  const groupLabel = t({ en: "View density", zh: "视图密度" });
  const selectedLabel = t({ en: "Selected", zh: "已选" });
  const values: readonly Density[] = ["compact", "cozy", "comfortable"];
  const { getOptionProps } = useRadioGroup({
    values,
    value,
    onChange: setValue,
  });
  return (
    <div css={[stack.tight, styles.alignStart]}>
      <div
        role="radiogroup"
        aria-label={groupLabel}
        css={[flex.row, corner.radius_round, styles.segmented]}
      >
        {values.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              {...getOptionProps(option)}
              css={[
                typeRole.label,
                buttonReset.base,
                flex.center,
                transition.colors,
                corner.radius_round,
                styles.segment,
                selected && styles.segmentSelected,
              ]}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
      <Text look="caption" tone="muted">
        {selectedLabel}:{" "}
        <span css={[corner.radius_1, styles.readout]}>{labels[value]}</span>
      </Text>
    </div>
  );
}

function UseRadioGroupSection() {
  return (
    <Showcase label="useRadioGroup" labelLook="code">
      <ShowcaseHelper>
        {t({
          en: 'Headless single-select semantics: the hook returns a `getOptionProps(value)` factory that supplies `role="radio"`, `aria-checked`, roving `tabIndex`, and the full WAI-ARIA keyboard model — arrows move and select, Home/End jump, focus follows selection. You render the markup and the styling; it owns the accessibility.',
          zh: '无头单选语义：钩子返回 `getOptionProps(value)` 工厂，提供 `role="radio"`、`aria-checked`、roving `tabIndex` 以及完整的 WAI-ARIA 键盘模型——方向键移动并选中，Home/End 跳转，焦点跟随选择。你负责标记与样式，它负责无障碍。',
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={hooksSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "Focus a segment, then use ← → and Home / End",
            zh: "聚焦某段后，使用 ← → 与 Home / End",
          })}
        >
          <DensityRadioGroup />
        </Specimen>
      </SpecimenGrid>
      <UsageSnippet
        code={`import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";

const { getOptionProps } = useRadioGroup({ values, value, onChange });

<div role="radiogroup" aria-label="View density">
  {values.map((v) => (
    <button key={v} {...getOptionProps(v)}>{labels[v]}</button>
  ))}
</div>`}
      />
    </Showcase>
  );
}

export function HooksShowcase() {
  return (
    <>
      <UseControlledSection />
      <UseDialogFocusSection />
      <UsePopoverSection />
      <UsePressSection />
      <UseRadioGroupSection />
    </>
  );
}

const styles = stylex.create({
  // useControlled
  stepper: {
    gap: controlSize._2,
    paddingBlock: space._1,
    paddingInline: space._2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  stepBtn: {
    inlineSize: "32px",
    blockSize: "32px",
    fontSize: controlSize._4,
    fontWeight: font.weight_5,
    color: {
      default: color.fg,
      ":hover": {
        default: null,
        [pointer.canHover]: color.fgOnAccent,
      },
    },
    backgroundColor: {
      default: color.bgControl,
      ":hover": { default: null, [pointer.canHover]: color.bgAccent },
    },
  },
  stepValue: {
    minInlineSize: "2ch",
    textAlign: "center",
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.fg,
  },
  alignStart: {
    alignItems: "flex-start",
  },
  readout: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.fg,
    paddingInline: space._1,
    paddingBlock: space._00,
    backgroundColor: color.bgControl,
  },
  // usePressHandlers
  pressTile: {
    paddingBlock: space._3,
    paddingInline: space._5,
    fontWeight: font.weight_6,
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
    touchAction: "manipulation",
    transform: "scale(1) translate(0, 0)",
    filter: "brightness(1)",
    transition: {
      default: `transform ${duration._150} ${easing.easeOut}, filter ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  pressTilePressed: {
    transform: {
      default: `scale(1.05) translate(${pressNudgeTokens.x}, ${pressNudgeTokens.y})`,
      [motionConstants.REDUCED_MOTION]: "scale(1) translate(0, 0)",
    },
    filter: {
      default: "brightness(1.15)",
      [motionConstants.REDUCED_MOTION]: "brightness(1)",
    },
  },
  // useRadioGroup
  segmented: {
    gap: controlSize._0,
    padding: space._00,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  segment: {
    paddingBlock: space._1,
    paddingInline: space._3,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    backgroundColor: "transparent",
    whiteSpace: "nowrap",
  },
  segmentSelected: {
    color: color.fg,
    backgroundColor: color.bgSurface,
    boxShadow: shadow._1,
    fontWeight: font.weight_6,
  },
});
