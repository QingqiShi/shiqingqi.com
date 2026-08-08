"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { useControlled } from "@tuja/ui/hooks/use-controlled";
import { useDialogFocus } from "@tuja/ui/hooks/use-dialog-focus";
import { usePopover } from "@tuja/ui/hooks/use-popover";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { color, font, layer, shadow, space } from "@tuja/ui/tokens.stylex";
import { useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

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
          a11y.focusRing,
          corner.radius_round,
          styles.stepBtn,
        ]}
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
        css={[
          buttonReset.base,
          flex.center,
          a11y.focusRing,
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
    <div css={[flex.col, styles.controlledStack]}>
      <StepperControl value={value} onChange={setValue} />
      <Text variant="caption" tone="muted">
        {stateLabel}:{" "}
        <span css={[corner.radius_1, styles.readout]}>{value}</span>
      </Text>
    </div>
  );
}

function UseControlledSection() {
  return (
    <Showcase label="useControlled" labelVariant="code">
      <ShowcaseHelper>
        {t({
          en: "Give a component both a controlled and an uncontrolled mode from one call. When a `controlled` value is passed it drives the component; otherwise the component keeps its own state from `defaultValue`. Reach for it whenever you build an input-like control.",
          zh: "一次调用即让组件同时拥有受控与非受控两种模式。传入 `controlled` 值时由它驱动组件；否则组件从 `defaultValue` 维护自身状态。构建任何类输入控件时都可使用。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
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

/** A modal whose focus lifecycle is fully managed by `useDialogFocus`. */
function DialogSpecimen() {
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
          css={[flex.col, corner.radius_3, styles.dialogCard]}
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
    <Showcase label="useDialogFocus" labelVariant="code">
      <ShowcaseHelper>
        {t({
          en: "The full focus lifecycle for a modal in one call: it moves focus into the dialog on open, traps Tab and Shift+Tab inside it, closes on Escape, and restores focus to the trigger on unmount. Use it for any dialog, sheet, or popover that must not leak focus.",
          zh: "一次调用即处理模态的完整焦点生命周期：打开时将焦点移入对话框，把 Tab 与 Shift+Tab 困在其中，按 Escape 关闭，并在卸载时把焦点还给触发元素。适用于任何不得泄漏焦点的对话框、抽屉或弹出层。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen
          caption={t({
            en: "Open, then Tab and Escape — focus stays trapped and restores",
            zh: "打开后按 Tab 和 Escape——焦点被困住并会恢复",
          })}
        >
          <DialogSpecimen />
        </Specimen>
      </SpecimenGrid>
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

type LabelIntent =
  "accent" | "info" | "success" | "warning" | "danger" | "neutral";

/** A picker whose popup is a bare colour grid — markup that `Popover`'s padded surface would fight. */
function IntentPickerSpecimen() {
  const [selected, setSelected] = useState<LabelIntent>("accent");
  const { open, setOpen, triggerProps, contentProps } = usePopover();
  const intents: readonly LabelIntent[] = [
    "accent",
    "info",
    "success",
    "warning",
    "danger",
    "neutral",
  ];
  const labels: Record<LabelIntent, string> = {
    accent: t({ en: "Accent", zh: "强调" }),
    info: t({ en: "Info", zh: "信息" }),
    success: t({ en: "Success", zh: "成功" }),
    warning: t({ en: "Warning", zh: "警告" }),
    danger: t({ en: "Danger", zh: "危险" }),
    neutral: t({ en: "Neutral", zh: "中性" }),
  };
  const fieldLabel = t({ en: "Label colour", zh: "标签颜色" });
  return (
    <div css={[flex.col, styles.popoverHost]}>
      <button
        {...triggerProps}
        aria-label={`${fieldLabel}: ${labels[selected]}`}
        css={[
          buttonReset.base,
          flex.row,
          a11y.focusRing,
          corner.radius_round,
          styles.intentTrigger,
        ]}
      >
        <span
          aria-hidden="true"
          css={[corner.radius_round, styles.intentDot, intentFill[selected]]}
        />
        {labels[selected]}
      </button>
      {open ? (
        <div {...contentProps} css={[corner.radius_2, styles.pickerPopup]}>
          {intents.map((intent) => (
            <button
              key={intent}
              type="button"
              aria-label={labels[intent]}
              aria-pressed={intent === selected}
              css={[
                buttonReset.base,
                a11y.focusRingInset,
                styles.pickerCell,
                intentFill[intent],
                intent === selected && styles.pickerCellSelected,
              ]}
              onClick={() => {
                setSelected(intent);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A hint placed above its trigger; growing it re-runs the placement maths. */
function PlacementSpecimen() {
  const [expanded, setExpanded] = useState(false);
  const { open, triggerProps, contentProps } = usePopover({
    placement: "top-start",
    onOpenChange: (next) => {
      if (!next) setExpanded(false);
    },
  });
  const triggerLabel = t({ en: "What is this?", zh: "这是什么？" });
  const summary = t({
    en: "Placement is measured against the viewport, so this sits above the trigger only while there is room above it.",
    zh: "定位以视口为准，因此只有上方有空间时，它才会停在触发元素之上。",
  });
  const detail = t({
    en: "Scroll until the trigger nears the top edge and the side flips to bottom. Expand or collapse this panel and the placement runs again — the hook watches the popup's own size as well as the trigger's.",
    zh: "向下滚动，触发元素接近顶边时它会翻到下方。展开或收起这块面板，定位也会重新计算——钩子既观察触发元素的尺寸，也观察弹出层自身的尺寸。",
  });
  return (
    <div css={[flex.col, styles.popoverHost]}>
      <button
        {...triggerProps}
        css={[buttonReset.base, a11y.focusRing, styles.hintTrigger]}
      >
        {triggerLabel}
      </button>
      {open ? (
        <div
          {...contentProps}
          css={[
            flex.col,
            popoverSurface.base,
            popoverSurface.enter,
            styles.hintPopup,
          ]}
        >
          <Text variant="caption" tone="muted">
            {summary}
          </Text>
          {expanded ? (
            <Text variant="caption" tone="muted">
              {detail}
            </Text>
          ) : null}
          <button
            type="button"
            css={[
              buttonReset.base,
              a11y.focusRing,
              corner.radius_1,
              styles.hintToggle,
            ]}
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            {expanded
              ? t({ en: "Show less", zh: "收起" })
              : t({ en: "Show more", zh: "展开" })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function UsePopoverSection() {
  return (
    <Showcase label="usePopover" labelVariant="code">
      <ShowcaseHelper>
        {t({
          en: "The headless layer beneath `Popover`, which is this hook plus a portal and the shared surface skin: it owns the open state, the placement, the dismissal rules, and the ARIA wiring, then hands back `triggerProps` and `contentProps` to spread onto your own elements. Placement is measured against the viewport rather than the trigger's corner — the side flips when it would overflow, both axes shift to stay on screen, and it re-places on scroll, on window resize, and whenever the trigger or the popup itself changes size. It moves focus into the popup on open and gives it back to the trigger on close, but it never traps focus and never locks scroll. Reach for it when the popup has to be something other than a padded surface — the element is yours to render, and it must be `position: fixed`, because the hook writes `top`/`left` straight to the node.",
          zh: "`Popover` 之下的无头层——`Popover` 就是这个钩子加上 portal 与共享的表面皮肤：它负责开合状态、定位、关闭时机与 ARIA 关联，再把 `triggerProps` 与 `contentProps` 交还给你，由你铺到自己的元素上。定位以视口为准，而非贴着触发元素的角落——放不下时会翻到对侧，两个轴向都会平移以留在屏幕内，并在滚动、窗口尺寸变化，以及触发元素或弹出层自身尺寸变化时重新定位。打开时它把焦点移入弹出层，关闭时再交还给触发元素，但它既不困陷焦点，也不锁定滚动。当弹出层需要的不是一块带内边距的表面时就用它——元素由你渲染，并且必须是 `position: fixed`，因为钩子会把 `top`/`left` 直接写到节点上。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
        <Specimen
          caption={t({
            en: "Your own popup — a bare colour grid, not a padded surface",
            zh: "由你渲染的弹出层——一片纯色方格，而非带内边距的表面",
          })}
        >
          <IntentPickerSpecimen />
        </Specimen>
        <Specimen
          caption={t({
            en: "Placed above; expand the panel and it re-places itself",
            zh: "置于上方；展开面板后它会重新定位",
          })}
        >
          <PlacementSpecimen />
        </Specimen>
      </SpecimenGrid>
      <UsageSnippet
        code={`import { usePopover } from "@tuja/ui/hooks/use-popover";

// placement defaults to "bottom-start", offset to 8
const { open, setOpen, toggle, triggerProps, contentProps } = usePopover({
  placement: "top-start",
});

<button {...triggerProps}>What is this?</button>
{open ? (
  // position: fixed — the hook writes top/left onto this node
  <div {...contentProps} css={styles.popup}>{/* your markup */}</div>
) : null}`}
      />
    </Showcase>
  );
}

/** A plain element wearing the Button press animation via `usePressHandlers`. */
function PressSpecimen() {
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
        corner.radius_2,
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
    <Showcase label="usePressHandlers / usePressAnimation" labelVariant="code">
      <ShowcaseHelper>
        {t({
          en: "The tactile press from Button — a spring scale, brightness lift, and directional nudge when the pointer drifts off — packaged for any element. `usePressAnimation` is the low-level state machine; `usePressHandlers` layers on click-cancel and the CSS custom properties. Reach for it to make a bespoke control feel like the rest of the system.",
          zh: "把 Button 的触感按压——弹性缩放、亮度提升，以及指针移开时的方向性偏移——封装给任意元素。`usePressAnimation` 是底层状态机；`usePressHandlers` 在其上叠加点击取消与 CSS 自定义属性。让自定义控件拥有与系统一致的手感时使用。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
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
                buttonReset.base,
                flex.center,
                transition.colors,
                a11y.focusRing,
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
      <Text variant="caption" tone="muted">
        {selectedLabel}:{" "}
        <span css={[corner.radius_1, styles.readout]}>{labels[value]}</span>
      </Text>
    </div>
  );
}

function UseRadioGroupSection() {
  return (
    <Showcase label="useRadioGroup" labelVariant="code">
      <ShowcaseHelper>
        {t({
          en: 'Headless single-select semantics: the hook returns a `getOptionProps(value)` factory that supplies `role="radio"`, `aria-checked`, roving `tabIndex`, and the full WAI-ARIA keyboard model — arrows move and select, Home/End jump, focus follows selection. You render the markup and the styling; it owns the accessibility.',
          zh: '无头单选语义：钩子返回 `getOptionProps(value)` 工厂，提供 `role="radio"`、`aria-checked`、roving `tabIndex` 以及完整的 WAI-ARIA 键盘模型——方向键移动并选中，Home/End 跳转，焦点跟随选择。你负责标记与样式，它负责无障碍。',
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={styles.specimenTracks}>
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
  // Wider tracks than the default: a dialog, a popover and a segmented control
  // all need more room than a button does.
  specimenTracks: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(260px, 1fr))",
    },
  },
  // useControlled
  stepper: {
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  stepBtn: {
    inlineSize: "32px",
    blockSize: "32px",
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
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: shadow._4,
  },
  dialogActions: {
    gap: space._2,
    justifyContent: "flex-end",
    marginBlockStart: space._2,
  },
  // usePopover
  popoverHost: {
    gap: space._2,
    alignItems: "flex-start",
  },
  intentTrigger: {
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMain,
    backgroundColor: {
      default: color.bgInteractiveRest,
      ":hover": color.bgInteractiveHover,
    },
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  intentDot: {
    inlineSize: "12px",
    blockSize: "12px",
    flexShrink: 0,
  },
  // `fixed` is the hook's one requirement — it writes `top`/`left` onto the
  // node. No portal and no surface skin here: both belong to `Popover`.
  pickerPopup: {
    position: "fixed",
    zIndex: layer.tooltip,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    // The hairline grid is the border colour showing through the gaps.
    gap: "1px",
    overflow: "hidden",
    backgroundColor: color.neutralBorder,
    boxShadow: shadow._5,
  },
  pickerCell: {
    inlineSize: "44px",
    blockSize: "36px",
    cursor: "pointer",
  },
  // Two rings so the mark survives every hue in both themes: the overlay colour
  // reads on the saturated fills, the text colour on the pale neutral one.
  pickerCellSelected: {
    boxShadow: `inset 0 0 0 3px ${color.bgOverlay}, inset 0 0 0 4px ${color.textMain}`,
  },
  hintTrigger: {
    paddingBlock: space._1,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
    },
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
    textAlign: "start",
    cursor: "pointer",
  },
  hintPopup: {
    position: "fixed",
    zIndex: layer.tooltip,
    gap: space._2,
    alignItems: "flex-start",
    boxSizing: "border-box",
    maxInlineSize: "260px",
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  hintToggle: {
    paddingBlock: space._00,
    paddingInline: space._1,
    marginInlineStart: `calc(-1 * ${space._1})`,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.accentText,
    cursor: "pointer",
  },
  // usePressHandlers
  pressTile: {
    paddingBlock: space._3,
    paddingInline: space._5,
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
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  segment: {
    paddingBlock: space._1,
    paddingInline: space._3,
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

/** Keyed by intent so the picker can look a fill up by value. */
const intentFill = stylex.create({
  accent: { backgroundColor: color.accent },
  info: { backgroundColor: color.info },
  success: { backgroundColor: color.success },
  warning: { backgroundColor: color.warning },
  danger: { backgroundColor: color.danger },
  neutral: { backgroundColor: color.neutral },
});
