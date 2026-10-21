import { type ComponentProps, type ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
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
   * StyleX overrides merged over the control's own — the escape hatch.
   *
   * @zh 合并到输入框上的 StyleX 覆盖样式——逃生舱口。
   */
  css?: StyleProp;
}

/**
 * Single-line text input with a built-in label, optional helper text, a live
 * status line, and an error state, all accessibly wired (`htmlFor`, `aria-describedby`,
 * `aria-invalid`, `role="alert"`). Forwards `ref` and native `<input>`
 * attributes to the underlying element, and stays server-renderable (no client
 * directive) since it only uses `useId`.
 */
export function TextField({
  label,
  labelHidden,
  description,
  error,
  status,
  size = "md",
  leading,
  trailing,
  id,
  required,
  disabled,
  css,
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
    <div css={[stack.tight, fieldStyles.root]}>
      <label
        htmlFor={fieldId}
        css={[
          typeRole.control,
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
          css={[typeRole.caption, fieldStyles.description]}
        >
          {description}
        </span>
      ) : null}
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
            fieldStyles.control,
            fieldSizeLine[size],
            transition.colors,
            a11y.focusRing,
            leading ? fieldStyles.hasLeadingAffix : null,
            trailing ? fieldStyles.hasTrailingAffix : null,
            hasError ? fieldStyles.controlInvalid : null,
            css,
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
          css={[typeRole.caption, fieldStyles.status]}
        >
          {status}
        </span>
      )}
      {hasError ? (
        <span
          id={errorId}
          role="alert"
          css={[typeRole.caption, fieldStyles.errorText]}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
