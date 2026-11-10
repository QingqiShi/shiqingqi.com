"use client";

import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  fieldSizeBox,
  fieldSizeInline,
  fieldStyles,
} from "./field-shared.stylex.ts";
import { useFieldAria } from "./use-field-aria.ts";

interface TextareaProps extends Omit<
  ComponentProps<"textarea">,
  "className" | "style"
> {
  /**
   * Visible label text. Always required for an accessible name, even when
   * hidden via {@link TextareaProps.labelHidden} — never rely on a placeholder
   * to name the field.
   *
   * @zh 命名字段的可见标签；即使被隐藏，也是无障碍名称所必需的。
   */
  label: string;
  /**
   * Visually hide the label (kept in the accessibility tree via `sr-only`).
   * The `label` string is still required.
   *
   * @zh 在视觉上隐藏标签，同时保留在无障碍树中。`label` 字符串仍为必填。
   */
  labelHidden?: boolean;
  /**
   * Helper text rendered under the label and wired via `aria-describedby`.
   *
   * @zh 标签下方的说明文字，通过 `aria-describedby` 关联到文本框。
   */
  description?: string;
  /**
   * Error message. When set, the control gets invalid styling + `aria-invalid`,
   * the message renders with `role="alert"`, and it is appended to the
   * control's `aria-describedby`.
   *
   * @zh 错误消息；设置 `aria-invalid`，以 `role="alert"` 渲染，并加入 `aria-describedby`。
   */
  error?: string;
  /**
   * Control height and padding via `controlSize`. Defaults to `"md"`.
   *
   * @zh 基于 `controlSize` 的控件高度与内边距。
   */
  size?: "sm" | "md" | "lg";
  /**
   * `"outline"` is the framed box of a form. `"ghost"` has no frame or fill
   * until the pointer is over it or it has focus, for a field that sits in a
   * row of text, such as a step of a checklist, where a frame on each row
   * would be noise. Defaults to `"outline"`.
   *
   * @zh `"outline"` 是表单中带边框的输入框。`"ghost"` 在指针悬停或获得焦点之前没有边框和底色，适合嵌在一行文字中的字段，例如清单中的一个步骤——此时每行都有边框只会显得杂乱。默认为 `"outline"`。
   */
  look?: "outline" | "ghost";
  /**
   * Colour of the text. `"muted"` makes the text recede, as `Text`'s muted
   * tone does, for a field whose item is done, such as the step of a
   * checklist beside a `Checkbox` with `look="done"`. The text is at full
   * contrast while the field has focus. Defaults to `"default"`.
   *
   * @zh 文字颜色。`"muted"` 让文字退后，与 `Text` 的 muted 色调一致，用于条目已完成的字段，例如清单中与 `look="done"` 的 `Checkbox` 相邻的步骤。字段获得焦点时文字恢复为完整对比度。默认为 `"default"`。
   */
  tone?: "default" | "muted";
  /**
   * Grow the textarea to fit its content instead of scrolling, disabling the
   * manual resize handle. Off, the textarea is a fixed `rows`-tall box the
   * user can drag to resize.
   *
   * @zh 随内容自动增高而非滚动，并禁用手动调整手柄。关闭时，文本框固定为 `rows` 行高，可由用户拖动调整大小。
   */
  autoGrow?: boolean;
  /**
   * StyleX styles merged over the field root, composed last, such as how the
   * field sits in the layout around it: a width, or `flexGrow` in a row.
   *
   * @zh 合并到字段根容器上的 StyleX 样式，最后合成，例如字段在周围布局中的位置：宽度，或在一行中的 `flexGrow`。
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the `<textarea>` itself, such as
   * `typeModifier.numeric` for an amount or a padding for a button laid
   * over it.
   *
   * @zh 合并到 `<textarea>` 本身上的 StyleX 样式，例如金额所用的 `typeModifier.numeric`，或为叠放其上的按钮留出的内边距。
   */
  controlCss?: StyleProp;
}

/**
 * Multi-line text input sharing `TextField`'s label / description / error
 * chrome, with an optional {@link TextareaProps.autoGrow} that grows the box
 * to fit its content.
 *
 * Renders on the client because auto-grow measures the element after layout.
 */
export function Textarea({
  label,
  labelHidden,
  description,
  error,
  size = "md",
  look = "outline",
  tone = "default",
  autoGrow = false,
  rows = 3,
  id,
  required,
  disabled,
  css,
  controlCss,
  value,
  defaultValue,
  onInput,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ref,
  ...rest
}: TextareaProps) {
  const {
    fieldId,
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ id, ariaDescribedBy, ariaInvalid, description, error });

  const innerRef = useRef<HTMLTextAreaElement>(null);
  const setRef = mergeRefs(innerRef, ref);

  const resize = () => {
    const element = innerRef.current;
    if (!element) {
      return;
    }
    if (!autoGrow) {
      // Clears the inline height from a prior auto-grow, so the control
      // returns to its `rows` height once `autoGrow` turns off.
      element.style.blockSize = "";
      return;
    }
    // Height resets first so shrinking is measured, then grows to fit content.
    // `+ 2` adds the 1px block-start/end borders that `scrollHeight` excludes.
    element.style.blockSize = "auto";
    element.style.blockSize = `${String(element.scrollHeight + 2)}px`;
  };

  const resizeToValue = useEffectEvent(resize);

  // Re-measures on mount, when `autoGrow` changes and when a controlled value
  // changes; the `onInput` wrapper below handles uncontrolled edits.
  useLayoutEffect(() => {
    resizeToValue();
  }, [autoGrow, value]);

  return (
    <div css={[stack.tight, fieldStyles.root, css]}>
      <div css={[stack.text, labelHidden && !hasDescription && a11y.srOnly]}>
        <label
          htmlFor={fieldId}
          css={[
            typeRole.label,
            fieldStyles.label,
            required && fieldStyles.labelRequired,
            labelHidden && a11y.srOnly,
          ]}
        >
          {label}
        </label>
        {hasDescription ? (
          <span
            id={descriptionId}
            css={[typeRole.bodySmall, fieldStyles.description]}
          >
            {description}
          </span>
        ) : null}
      </div>
      <textarea
        {...rest}
        ref={setRef}
        id={fieldId}
        rows={rows}
        required={required}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={resolvedAriaInvalid}
        aria-describedby={describedBy}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        css={[
          typeRole.control,
          typeModifier.verbatim,
          fieldStyles.box,
          fieldStyles.control,
          fieldStyles.multiline,
          fieldSizeInline[size],
          fieldSizeBox[size],
          look === "ghost" ? fieldStyles.ghost : null,
          tone === "muted" ? fieldStyles.controlMuted : null,
          autoGrow ? fieldStyles.noResize : null,
          transition.colors,
          a11y.focusRing,
          hasError ? fieldStyles.controlInvalid : null,
          controlCss,
        ]}
      />
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
