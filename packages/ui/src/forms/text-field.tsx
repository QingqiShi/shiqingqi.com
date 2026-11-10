import { type ComponentProps, type ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  fieldSizeLine,
  fieldSizeInline,
  fieldStyles,
} from "./field-shared.stylex.ts";
import { useFieldAria } from "./use-field-aria.ts";

// `size` on the intrinsic input is the HTML character-width attribute; the
// design system reuses the name for its own scale, so drop the native one.
interface TextFieldProps extends Omit<
  ComponentProps<"input">,
  "size" | "className" | "style"
> {
  /**
   * Visible label text. Always required for an accessible name, even when
   * hidden via {@link TextFieldProps.labelHidden} — never rely on a
   * placeholder to name the field.
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
   * @zh 标签下方的说明文字，通过 `aria-describedby` 关联到输入框。
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
   * Live text under the control that follows what the visitor types, such as
   * a preview of what the input will do. It is a polite live region, so a
   * screen reader reads each change. Pass `""` while there is nothing to say:
   * the region must exist before its first text, and it takes no space while
   * empty.
   *
   * @zh 输入框下方随输入实时变化的文字，例如输入结果的预览。以礼貌型实时区域呈现，屏幕阅读器会读出每次变化。暂无内容时传入 `""`：实时区域须在首次出现文字前就已存在；为空时不占空间。
   */
  status?: string;
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
   * Decorative leading adornment (icon or unit), rendered `aria-hidden`.
   *
   * @zh 前置装饰内容（图标或单位），以 `aria-hidden` 渲染。
   */
  leading?: ReactNode;
  /**
   * Decorative trailing adornment (icon or unit), rendered `aria-hidden`.
   *
   * @zh 后置装饰内容（图标或单位），以 `aria-hidden` 渲染。
   */
  trailing?: ReactNode;
  /**
   * StyleX styles merged over the field root, composed last, such as how the
   * field sits in the layout around it: a width, or `flexGrow` in a row.
   *
   * @zh 合并到字段根容器上的 StyleX 样式，最后合成，例如字段在周围布局中的位置：宽度，或在一行中的 `flexGrow`。
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the `<input>` itself, such as
   * `typeModifier.numeric` for an amount or a padding for a button laid
   * over it.
   *
   * @zh 合并到 `<input>` 本身上的 StyleX 样式，例如金额所用的 `typeModifier.numeric`，或为叠放其上的按钮留出的内边距。
   */
  controlCss?: StyleProp;
}

/**
 * Single-line text input with a built-in label, optional helper text, a live
 * status line, and an error state, all accessibly wired (`htmlFor`, `aria-describedby`,
 * `aria-invalid`, `role="alert"`). Forwards `ref` and native `<input>`
 * attributes to the underlying element. It has no client directive, so a
 * server component can render it: its only hook is `useId`. A `type="search"` field shows the
 * browser's clear button in the colours of the theme, where the browser draws
 * one (WebKit and Blink).
 */
export function TextField({
  label,
  labelHidden,
  description,
  error,
  status,
  size = "md",
  look = "outline",
  tone = "default",
  leading,
  trailing,
  id,
  required,
  disabled,
  css,
  controlCss,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ref,
  ...rest
}: TextFieldProps) {
  const {
    fieldId,
    descriptionId,
    errorId,
    statusId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({
    id,
    ariaDescribedBy,
    ariaInvalid,
    description,
    error,
    status,
  });

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
      <div css={[fieldStyles.controlAffixRow, fieldSizeInline[size]]}>
        {leading ? (
          <span
            css={[typeRole.control, fieldStyles.affix, fieldStyles.affixStart]}
            aria-hidden
          >
            {leading}
          </span>
        ) : null}
        <input
          {...rest}
          ref={ref}
          id={fieldId}
          required={required}
          disabled={disabled}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          css={[
            typeRole.control,
            typeModifier.verbatim,
            fieldStyles.box,
            fieldStyles.control,
            fieldSizeLine[size],
            look === "ghost" ? fieldStyles.ghost : null,
            tone === "muted" ? fieldStyles.controlMuted : null,
            transition.colors,
            a11y.focusRing,
            leading ? fieldStyles.hasLeadingAffix : null,
            trailing ? fieldStyles.hasTrailingAffix : null,
            hasError ? fieldStyles.controlInvalid : null,
            controlCss,
          ]}
        />
        {trailing ? (
          <span
            css={[typeRole.control, fieldStyles.affix, fieldStyles.affixEnd]}
            aria-hidden
          >
            {trailing}
          </span>
        ) : null}
      </div>
      {status === undefined ? null : (
        <span
          id={statusId}
          role="status"
          css={[typeRole.bodySmall, fieldStyles.status]}
        >
          {status}
        </span>
      )}
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
