"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { useControlled } from "@tuja/ui/hooks/use-controlled";
import { useDialogFocus } from "@tuja/ui/hooks/use-dialog-focus";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import { useRef, useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

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
    <div css={[flex.row, styles.stepper]}>
      <button
        type="button"
        aria-label={decLabel}
        css={[buttonReset.base, flex.center, a11y.focusRing, styles.stepBtn]}
        onClick={() => {
          commit(value - 1);
        }}
      >
        −
      </button>
      <span css={styles.stepValue}>{value}</span>
      <button
        type="button"
        aria-label={incLabel}
        css={[buttonReset.base, flex.center, a11y.focusRing, styles.stepBtn]}
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
function ControlledStepperDemo() {
  const [value, setValue] = useState(2);
  const stateLabel = t({ en: "Parent state", zh: "父组件状态" });
  return (
    <div css={[flex.col, styles.controlledStack]}>
      <StepperControl value={value} onChange={setValue} />
      <Text variant="caption" tone="muted">
        {stateLabel}: <span css={styles.readout}>{value}</span>
      </Text>
    </div>
  );
}

function UseControlledSection() {
  return (
    <Showcase label="useControlled">
      <ShowcaseHelper>
        {t({
          en: "Give a component both a controlled and an uncontrolled mode from one call. When a `controlled` value is passed it drives the component; otherwise the component keeps its own state from `defaultValue`. Reach for it whenever you build an input-like control.",
          zh: "一次调用即让组件同时拥有受控与非受控两种模式。传入 `controlled` 值时由它驱动组件；否则组件从 `defaultValue` 维护自身状态。构建任何类输入控件时都可使用。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell
          caption={t({
            en: "Uncontrolled — owns its own state",
            zh: "非受控——自行维护状态",
          })}
        >
          <StepperControl defaultValue={0} />
        </DemoCell>
        <DemoCell
          caption={t({
            en: "Controlled — parent owns the value",
            zh: "受控——由父组件持有值",
          })}
        >
          <ControlledStepperDemo />
        </DemoCell>
      </div>
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

/** A modal whose focus lifecycle is fully managed by `useDialogFocus`. */
function DialogDemo() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({
    isOpen: open,
    dialogRef,
    onClose: () => {
      setOpen(false);
    },
  });
  const openLabel = t({ en: "Delete list…", zh: "删除清单…" });
  const dialogLabel = t({ en: "Delete confirmation", zh: "删除确认" });
  const title = t({ en: "Delete this list?", zh: "删除该清单？" });
  const body = t({
    en: "This removes the list and everything in it. This action cannot be undone.",
    zh: "这将删除清单及其中所有内容，此操作无法撤销。",
  });
  const cancel = t({ en: "Cancel", zh: "取消" });
  const confirm = t({ en: "Delete", zh: "删除" });
  return (
    <div css={[flex.col, styles.dialogHost]}>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {openLabel}
      </Button>
      {open ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          css={[flex.col, styles.dialogCard]}
        >
          <Heading level={3}>{title}</Heading>
          <Text variant="bodySmall" tone="muted">
            {body}
          </Text>
          <div css={[flex.row, styles.dialogActions]}>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              {cancel}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setOpen(false);
              }}
            >
              {confirm}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UseDialogFocusSection() {
  return (
    <Showcase label="useDialogFocus">
      <ShowcaseHelper>
        {t({
          en: "The full focus lifecycle for a modal in one call: it moves focus into the dialog on open, traps Tab and Shift+Tab inside it, closes on Escape, and restores focus to the trigger on unmount. Use it for any dialog, sheet, or popover that must not leak focus.",
          zh: "一次调用即处理模态的完整焦点生命周期：打开时将焦点移入对话框，把 Tab 与 Shift+Tab 困在其中，按 Escape 关闭，并在卸载时把焦点还给触发元素。适用于任何不得泄漏焦点的对话框、抽屉或弹出层。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell
          caption={t({
            en: "Open, then Tab and Escape — focus stays trapped and restores",
            zh: "打开后按 Tab 和 Escape——焦点被困住并会恢复",
          })}
        >
          <DialogDemo />
        </DemoCell>
      </div>
      <UsageSnippet
        code={`import { useRef, useState } from "react";
import { useDialogFocus } from "@tuja/ui/hooks/use-dialog-focus";

const dialogRef = useRef(null);
useDialogFocus({ isOpen, dialogRef, onClose: () => setOpen(false) });

<div role="dialog" aria-modal="true" ref={dialogRef}>
  {/* Tab trap, Escape-to-close, focus restore all handled */}
</div>`}
      />
    </Showcase>
  );
}

/** A plain element wearing the Button press animation via `usePressHandlers`. */
function PressDemo() {
  const ref = useRef<HTMLButtonElement>(null);
  const { isPressed, pressedStyle, handlers } = usePressHandlers({
    targetRef: ref,
  });
  const label = t({ en: "Press and hold", zh: "按住试试" });
  return (
    <button
      ref={ref}
      type="button"
      {...handlers}
      style={{ ...pressedStyle }}
      css={[
        buttonReset.base,
        flex.center,
        a11y.focusRing,
        styles.pressTile,
        isPressed && styles.pressTilePressed,
      ]}
    >
      {label}
    </button>
  );
}

function UsePressSection() {
  return (
    <Showcase label="usePressHandlers / usePressAnimation">
      <ShowcaseHelper>
        {t({
          en: "The tactile press from Button — a spring scale, brightness lift, and directional nudge when the pointer drifts off — packaged for any element. `usePressAnimation` is the low-level state machine; `usePressHandlers` layers on click-cancel and the CSS custom properties. Reach for it to make a bespoke control feel like the rest of the system.",
          zh: "把 Button 的触感按压——弹性缩放、亮度提升，以及指针移开时的方向性偏移——封装给任意元素。`usePressAnimation` 是底层状态机；`usePressHandlers` 在其上叠加点击取消与 CSS 自定义属性。让自定义控件拥有与系统一致的手感时使用。",
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell
          caption={t({
            en: "Press with a pointer or Space/Enter; drag off to see the nudge",
            zh: "用指针或空格/回车按下；拖离可见方向偏移",
          })}
        >
          <PressDemo />
        </DemoCell>
      </div>
      <UsageSnippet
        code={`import { useRef } from "react";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";

const ref = useRef(null);
const { isPressed, pressedStyle, handlers } = usePressHandlers({
  targetRef: ref,
  onClick,
});

<button ref={ref} {...handlers} style={pressedStyle}
  css={[isPressed && styles.pressed]} />`}
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
    <div css={[flex.col, styles.radioStack]}>
      <div
        role="radiogroup"
        aria-label={groupLabel}
        css={[flex.row, styles.segmented]}
      >
        {values.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              {...getOptionProps(option)}
              css={[
                buttonReset.base,
                flex.center,
                transition.colors,
                a11y.focusRing,
                styles.segment,
                selected && styles.segmentSelected,
              ]}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
      <Text variant="caption" tone="muted">
        {selectedLabel}: <span css={styles.readout}>{labels[value]}</span>
      </Text>
    </div>
  );
}

function UseRadioGroupSection() {
  return (
    <Showcase label="useRadioGroup">
      <ShowcaseHelper>
        {t({
          en: 'Headless single-select semantics: the hook returns a `getOptionProps(value)` factory that supplies `role="radio"`, `aria-checked`, roving `tabIndex`, and the full WAI-ARIA keyboard model — arrows move and select, Home/End jump, focus follows selection. You render the markup and the styling; it owns the accessibility.',
          zh: '无头单选语义：钩子返回 `getOptionProps(value)` 工厂，提供 `role="radio"`、`aria-checked`、roving `tabIndex` 以及完整的 WAI-ARIA 键盘模型——方向键移动并选中，Home/End 跳转，焦点跟随选择。你负责标记与样式，它负责无障碍。',
        })}
      </ShowcaseHelper>
      <div css={styles.demoGrid}>
        <DemoCell
          caption={t({
            en: "Focus a segment, then use ← → and Home / End",
            zh: "聚焦某段后，使用 ← → 与 Home / End",
          })}
        >
          <DensityRadioGroup />
        </DemoCell>
      </div>
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
      <UsePressSection />
      <UseRadioGroupSection />
    </>
  );
}

const styles = stylex.create({
  demoGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(260px, 1fr))",
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
  // useControlled
  stepper: {
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderRadius: border.radius_round,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  stepBtn: {
    inlineSize: "32px",
    blockSize: "32px",
    borderRadius: border.radius_round,
    fontSize: font.uiHeading3,
    fontWeight: font.weight_5,
    color: {
      default: color.textMain,
      ":hover": color.accentOn,
    },
    backgroundColor: {
      default: color.bgInteractiveRest,
      ":hover": color.accent,
    },
  },
  stepValue: {
    minInlineSize: "2ch",
    textAlign: "center",
    fontFamily: font.familyMono,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
  },
  controlledStack: {
    gap: space._2,
    alignItems: "flex-start",
  },
  readout: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.textMain,
    paddingInline: space._1,
    paddingBlock: space._00,
    borderRadius: border.radius_1,
    backgroundColor: color.bgInteractiveRest,
  },
  // useDialogFocus
  dialogHost: {
    gap: space._3,
    alignItems: "flex-start",
    inlineSize: "100%",
  },
  dialogCard: {
    gap: space._2,
    inlineSize: "100%",
    maxInlineSize: "320px",
    paddingBlock: space._4,
    paddingInline: space._4,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: shadow._4,
  },
  dialogActions: {
    gap: space._2,
    justifyContent: "flex-end",
    marginBlockStart: space._2,
  },
  // usePressHandlers
  pressTile: {
    paddingBlock: space._3,
    paddingInline: space._5,
    borderRadius: border.radius_2,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.accentOn,
    backgroundColor: color.accent,
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
      default:
        "scale(1.05) translate(var(--button-nudge-x, 0), var(--button-nudge-y, 0))",
      [motionConstants.REDUCED_MOTION]: "scale(1) translate(0, 0)",
    },
    filter: {
      default: "brightness(1.15)",
      [motionConstants.REDUCED_MOTION]: "brightness(1)",
    },
  },
  // useRadioGroup
  radioStack: {
    gap: space._2,
    alignItems: "flex-start",
  },
  segmented: {
    gap: space._00,
    padding: space._00,
    borderRadius: border.radius_round,
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  segment: {
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
    },
    backgroundColor: "transparent",
    whiteSpace: "nowrap",
  },
  segmentSelected: {
    color: color.textMain,
    backgroundColor: color.bgSurface,
    boxShadow: shadow._1,
    fontWeight: font.weight_6,
  },
});
