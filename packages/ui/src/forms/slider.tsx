"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import { SLIDER_HANDLE } from "../effect-layer/slider-liquid-effect.ts";
import { useControlled } from "../hooks/use-controlled.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import type { StyleProp } from "../types.ts";
import { fieldStyles } from "./field-shared.stylex.ts";
import {
  sliderAt,
  sliderGrooveMarker,
  sliderMarker,
  sliderSizes,
  sliderStyles as styles,
  sliderTick,
} from "./slider.stylex.ts";
import { fractionOf } from "./snap-to-step.ts";
import { useFieldAria } from "./use-field-aria.ts";
import { useSliderMotion } from "./use-slider-motion.ts";

// The design system's `size` scale replaces the native character-width attribute of the same name.
interface SliderOwnProps extends Omit<
  ComponentProps<"input">,
  | "type"
  | "size"
  | "min"
  | "max"
  | "step"
  | "value"
  | "defaultValue"
  | "onChange"
  | "children"
  | "className"
  | "style"
> {
  /**
   * Label text, printed at the start of the panel, and the control's
   * accessible name — it lands on the `<input>` itself via `htmlFor`, never
   * on a wrapper. Required even when hidden via {@link SliderProps.labelHidden}.
   *
   * @zh 标签文本，印在面板起始处，也是控件的无障碍名称——通过 `htmlFor` 落在 `<input>` 本身上，而非外层容器。即使通过 `labelHidden` 隐藏，仍必须提供。
   */
  label: string;
  /**
   * Leave the label off the panel (kept in the accessibility tree via
   * `sr-only`).
   *
   * @zh 不在面板上印标签（通过 `sr-only` 保留在无障碍树中）。
   */
  labelHidden?: boolean;
  /**
   * Helper text rendered under the control and wired via `aria-describedby`.
   *
   * @zh 控件下方的说明文字，通过 `aria-describedby` 关联到输入框。
   */
  description?: string;
  /**
   * Error message. Turns the groove's edge and the handle danger-coloured,
   * sets `aria-invalid`, renders with `role="alert"`, and joins
   * `aria-describedby`.
   *
   * @zh 错误消息。把凹槽边缘和把手变为危险色，设置 `aria-invalid`，以 `role="alert"` 渲染，并加入 `aria-describedby`。
   */
  error?: string;
  /**
   * The value as it shows at the end of the groove, formatted by the
   * consumer. The plain number when it is left out.
   *
   * @zh 显示在凹槽末端的数值，格式化由调用方决定。不提供时显示原始数字。
   */
  readout?: ReactNode;
  /**
   * Lower bound of the range, and where an uncontrolled Slider with no
   * `defaultValue` starts.
   *
   * @zh 范围的下界；未设置 `defaultValue` 的非受控滑块也从这里开始。
   */
  min?: number;
  /**
   * Upper bound of the range.
   *
   * @zh 范围的上界。
   */
  max?: number;
  /**
   * Granularity of each step, for the pointer and for the arrow keys alike.
   *
   * @zh 每一步的粒度，指针与方向键同样适用。
   */
  step?: number;
  /**
   * Fires once when an interaction that moved the value ends — pointer release,
   * key release, or losing focus mid-gesture.
   *
   * @zh 当一次改变了数值的交互结束时触发一次——松开指针、松开按键，或在手势中途失去焦点。
   */
  onCommit?: (value: number) => void;
  /**
   * The control's height, on the same `controlHeight` steps as a Button or
   * a TextField of the same `size`.
   *
   * @zh 控件高度，与同一 `size` 的按钮或输入框处在同一 `controlHeight` 档位。
   */
  size?: "sm" | "md" | "lg";
  /**
   * StyleX styles merged over the root wrapper — the escape hatch.
   *
   * @zh 合并到根容器上的 StyleX 样式——逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A controlled value without `onChange` is a dead control: `useControlled`
 * returns a no-op setter, so the panel springs back the moment it is released.
 */
type SliderValueProps =
  | {
      /**
       * Controlled value. Requires `onChange` — without it, the panel
       * springs back to its current value the moment it is released.
       *
       * @zh 受控数值，需同时提供 `onChange`——否则面板在松开的瞬间就会弹回原值。
       */
      value: number;
      /**
       * Fires with the next number on every value change, including each
       * step of a drag.
       *
       * @zh 每次数值变化时以新数值触发，拖动过程中的每一步也包含在内。
       */
      onChange: (value: number) => void;
      defaultValue?: undefined;
    }
  | {
      value?: undefined;
      /**
       * Fires with the next number on every value change, including each
       * step of a drag.
       *
       * @zh 每次数值变化时以新数值触发，拖动过程中的每一步也包含在内。
       */
      onChange?: (value: number) => void;
      /**
       * Starting value for an uncontrolled Slider. Cannot be combined with
       * `value`.
       *
       * @default min
       * @zh 非受控滑块的起始数值，不能与 `value` 同时使用。
       */
      defaultValue?: number;
    };

type SliderProps = SliderOwnProps & SliderValueProps;

/**
 * Single-value slider. A panel fills its groove from the start to the
 * value, with the label printed on it and on the groove beneath, and a
 * handle line at its far edge; the value sits at the end of the groove and
 * climbs onto the panel when the panel covers it. A drag, from anywhere on
 * the control, moves the panel by the steps of the range, and a tap sends
 * it to the point. While a pointer holds it, the panel melts into clear
 * liquid that bends the ticks and the value under it, where the effect
 * layer runs. A native `<input type="range">` underneath carries the
 * keyboard, focus and value announcement. `onChange` streams every step;
 * `onCommit` fires once per interaction.
 */
export function Slider({
  label,
  labelHidden = false,
  description,
  error,
  readout,
  value: valueProp,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onCommit,
  size = "md",
  css,
  id,
  disabled = false,
  onKeyUp,
  onBlur,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-valuetext": ariaValueText,
  ref,
  ...rest
}: SliderProps) {
  const [value, setValue] = useControlled({
    controlled: valueProp,
    defaultValue: defaultValue ?? min,
  });
  const range = { min, max, step };
  const pendingCommitRef = useRef<number | null>(null);

  function commit() {
    const pending = pendingCommitRef.current;
    if (pending === null) {
      return;
    }
    pendingCommitRef.current = null;
    onCommit?.(pending);
  }

  function change(next: number) {
    if (next === value) return;
    pendingCommitRef.current = next;
    setValue(next);
    onChange?.(next);
  }

  const {
    controlRef,
    grooveRef,
    innerRef,
    topPieceRef,
    labelRef,
    valueRef,
    panelRef,
    inputRef,
    handlers,
    ticks,
  } = useSliderMotion({
    value,
    range,
    labelHidden,
    disabled,
    change,
    commit,
  });

  const {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ id, ariaDescribedBy, ariaInvalid, description, error });

  const shown = readout ?? String(value);
  const valueText =
    ariaValueText ??
    (typeof readout === "string" || typeof readout === "number"
      ? String(readout)
      : undefined);

  return (
    <div css={[stack.tight, fieldStyles.root, css]}>
      {labelHidden ? (
        <label htmlFor={fieldId} css={a11y.srOnly}>
          {label}
        </label>
      ) : null}
      <div
        ref={controlRef}
        {...handlers}
        css={[
          sliderMarker,
          styles.control,
          sliderSizes[size],
          sliderAt.at(fractionOf(value, range)),
          disabled && styles.controlDisabled,
        ]}
      >
        <div
          ref={grooveRef}
          data-effect-content=""
          css={[
            size === "sm" ? typeRole.controlCaption : typeRole.control,
            typeModifier.numeric,
            sliderGrooveMarker,
            corner.squircle_round,
            styles.groove,
            hasError && styles.grooveInvalid,
          ]}
        >
          <div ref={innerRef} css={styles.inner}>
            {ticks.map((x) => (
              <span
                key={x}
                aria-hidden
                css={[corner.radius_round, styles.tick, sliderTick.at(x)]}
              />
            ))}
            {labelHidden ? null : (
              <label
                ref={labelRef}
                htmlFor={fieldId}
                css={[
                  styles.text,
                  styles.label,
                  styles.grooveText,
                  styles.snapshotOnly,
                ]}
              >
                {label}
              </label>
            )}
            {labelHidden ? null : (
              <div
                aria-hidden
                data-effect-omit=""
                css={[styles.labelRow, styles.grooveText]}
              >
                <span css={[styles.text, styles.labelMoved]}>{label}</span>
              </div>
            )}
            <span
              ref={valueRef}
              aria-hidden
              css={[styles.text, styles.value, styles.snapshotOnly]}
            >
              {shown}
            </span>
            <div
              aria-hidden
              data-effect-omit=""
              css={[styles.valueRow, styles.grooveText]}
            >
              <span css={[styles.text, styles.valueMoved]}>{shown}</span>
            </div>
            <div aria-hidden data-effect-omit="" css={styles.panelGroup}>
              <div ref={panelRef} css={[corner.squircle_round, styles.panel]}>
                {labelHidden ? null : (
                  <div
                    css={[
                      styles.labelRow,
                      styles.panelLabelRow,
                      styles.labelFade,
                    ]}
                  >
                    <span
                      css={[styles.text, styles.labelMoved, styles.panelText]}
                    >
                      {label}
                    </span>
                  </div>
                )}
                <div
                  css={[
                    styles.valueRow,
                    styles.panelValueRow,
                    styles.valueFade,
                  ]}
                >
                  <span
                    css={[styles.text, styles.valueMoved, styles.panelText]}
                  >
                    {shown}
                  </span>
                </div>
              </div>
              <div css={[corner.squircle_round, styles.panelCap]}>
                {labelHidden ? null : (
                  <div css={[styles.labelRow, styles.labelFade]}>
                    <span
                      css={[styles.text, styles.labelMoved, styles.panelText]}
                    >
                      {label}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div aria-hidden data-effect-omit="" css={styles.handle}>
              <span
                ref={topPieceRef}
                {...{ [SLIDER_HANDLE]: "" }}
                css={[
                  corner.radius_round,
                  styles.piece,
                  styles.topPiece,
                  hasError && styles.pieceInvalid,
                ]}
              />
              <span
                css={[
                  corner.radius_round,
                  styles.piece,
                  styles.bottomPiece,
                  hasError && styles.pieceInvalid,
                ]}
              />
            </div>
          </div>
        </div>
        <input
          {...rest}
          ref={mergeRefs(inputRef, ref)}
          id={fieldId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          aria-valuetext={valueText}
          css={[
            a11y.focusRing,
            corner.squircle_round,
            styles.input,
            hasError && styles.inputInvalid,
          ]}
          onChange={(event) => {
            change(event.currentTarget.valueAsNumber);
          }}
          onKeyUp={(event) => {
            commit();
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            commit();
            onBlur?.(event);
          }}
        />
      </div>
      {hasDescription ? (
        <span
          id={descriptionId}
          css={[typeRole.bodySmall, fieldStyles.description]}
        >
          {description}
        </span>
      ) : null}
      {hasError ? (
        <span
          id={errorId}
          role="alert"
          css={[typeRole.bodySmall, fieldStyles.errorText]}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
