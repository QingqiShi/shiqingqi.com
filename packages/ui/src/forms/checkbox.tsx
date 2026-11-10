"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, type ComponentProps } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { border, controlSize, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { checkboxMark, checkboxTokens } from "./checkbox.stylex.ts";
import { fieldStyles } from "./field-shared.stylex.ts";
import { useFieldAria } from "./use-field-aria.ts";

// Mask images: only their alpha matters, the colour comes from `currentColor`.
// Percent-encode spaces and brackets so the data URI survives CSS parsing.
const CHECK_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M4%208.5l3%203%205-6'%20fill='none'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'/%3E%3C/svg%3E";
const DASH_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M4%208h8'%20fill='none'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'/%3E%3C/svg%3E";
// The dot sits below the centre of the box, at the middle of the lowercase
// letters of a line that the box is centred on.
const DOT_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Ccircle%20cx='8'%20cy='10'%20r='3'%20fill='black'/%3E%3C/svg%3E";

interface CheckboxProps extends Omit<
  ComponentProps<"input">,
  "type" | "size" | "children" | "className" | "style"
> {
  /**
   * Visible text that labels the checkbox. Always rendered into the DOM so it
   * names the control; pass `labelHidden` to keep it screen-reader-only.
   *
   * @zh 命名复选框的可见文本；即使被隐藏，也是无障碍名称所必需的。
   */
  label: string;
  /**
   * Visually hide the label while keeping it as the accessible name. Use for a
   * checkbox whose meaning is already clear from surrounding context.
   *
   * @zh 在视觉上隐藏标签，同时保留为无障碍名称。
   */
  labelHidden?: boolean;
  /**
   * Supporting copy under the label and aligned with it, wired via
   * `aria-describedby`.
   *
   * @zh 标签下方并与标签对齐的辅助说明，通过 `aria-describedby` 关联。
   */
  description?: string;
  /**
   * Error message shown beneath the label. Presence flips `aria-invalid` and
   * appends the message to `aria-describedby`.
   *
   * @zh 标签下方的错误消息；切换 `aria-invalid` 并加入 `aria-describedby`。
   */
  error?: string;
  /**
   * Renders the mixed/partial ("dash") state. Reflected onto the DOM node's
   * `.indeterminate` property via a ref effect since it has no HTML attribute.
   *
   * @zh 渲染混合/部分选中的横线状态；由于没有对应的 HTML 属性，通过 `ref` Effect 反映到 DOM 节点的 `.indeterminate` 属性。
   */
  indeterminate?: boolean;
  /**
   * Box and type scale. Defaults to `"md"`.
   *
   * @zh 方框与字号的尺寸。
   */
  size?: "sm" | "md";
  /**
   * What the tick means. Omit for a plain choice, such as an option in a form.
   *
   * `"done"` says that a task is finished: once ticked, the box takes the
   * muted colour of a done title, so done items recede. `"selection"` picks
   * the item for an action, such as a bulk delete. Its box is round, so a
   * picked item does not look like a done one, and an ancestor with
   * `selected.marked` takes the selected look while the box is ticked.
   *
   * A round mark is not a radio: across the system, a dot marks the only
   * choice and a tick marks one of several. Thus a ticked round box shows a
   * tick, never a dot.
   *
   * @zh 勾选的含义。普通选项（例如表单中的选项）省略即可。
   *
   * `"done"` 表示任务已完成：勾选后方框变为已完成标题的弱化色，让已完成的条目退后。`"selection"` 为某个操作选中条目，例如批量删除。它的方框是圆形，因此选中的条目不会看起来像已完成；方框勾选时，带有 `selected.marked` 的祖先元素显示选中外观。
   *
   * 圆形标记并不是单选：在整个系统中，圆点表示唯一的选择，勾表示多个选择中的一个。因此勾选后的圆形方框显示勾，而不是圆点。
   */
  look?: "done" | "selection";
  /**
   * Shows the state with no way to change it, as in a preview: a muted tick
   * when checked, a muted dot when not, and no box. The input keeps its place
   * in the tab order with `aria-readonly`, as a read-only `TextField` does.
   *
   * @zh 只显示状态而不能更改，例如在预览中：勾选时为弱化的勾，未勾选时为弱化的圆点，没有方框。输入框带有 `aria-readonly`，并与只读的 `TextField` 一样保留在 Tab 顺序中。
   */
  readOnly?: boolean;
  /**
   * StyleX styles merged over the root wrapper — the config-layer escape hatch.
   *
   * @zh 合并到根容器上的 StyleX 样式——逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A labelled checkbox built on a native `<input type="checkbox">`, restyled in
 * place (`appearance: none`) rather than hidden behind a proxy element.
 * Forwards native input props, and supports a tri-state `indeterminate` dash.
 */
export function Checkbox({
  label,
  labelHidden,
  description,
  error,
  indeterminate,
  size = "md",
  look,
  readOnly = false,
  css,
  disabled,
  onClick,
  ref: forwardedRef,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setInputRef = mergeRefs(inputRef, forwardedRef);

  // No HTML attribute exists for `indeterminate`, so set it imperatively.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  const {
    descriptionId,
    errorId,
    hasDescription,
    hasError,
    describedBy,
    ariaInvalid: resolvedAriaInvalid,
  } = useFieldAria({ ariaDescribedBy, ariaInvalid, description, error });

  return (
    <span css={[stack.text, styles.root, css]}>
      <label
        css={[
          flex.row,
          styles.row,
          disabled && styles.rowDisabled,
          readOnly && styles.rowReadOnly,
        ]}
      >
        <input
          {...rest}
          ref={setInputRef}
          type="checkbox"
          disabled={disabled}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={describedBy}
          data-selection-mark={look === "selection" ? "" : undefined}
          onClick={(event) => {
            onClick?.(event);
            // A checkbox ignores the native `readonly` attribute.
            if (readOnly) event.preventDefault();
          }}
          css={[
            a11y.focusRing,
            transition.colors,
            look === "selection" ? corner.radius_round : corner.radius_1,
            checkboxMark.base,
            styles.box,
            look === "done" && styles.done,
            sizeStyles[size],
            !!error && styles.boxError,
            // After the error, so that a read-only mark with no box takes no
            // danger edge. It keeps the danger focus ring.
            readOnly && styles.readOnly,
          ]}
        />
        <span
          css={
            labelHidden ? a11y.srOnly : [labelSizeRoles[size], styles.labelText]
          }
        >
          {label}
        </span>
      </label>
      {hasDescription || hasError ? (
        <span css={[stack.text, !labelHidden && underLabelStyles[size]]}>
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
        </span>
      ) : null}
    </span>
  );
}

const styles = stylex.create({
  root: {
    alignItems: "flex-start",
  },
  row: {
    gap: controlSize._2,
    cursor: "pointer",
  },
  rowDisabled: {
    cursor: "not-allowed",
  },
  rowReadOnly: {
    cursor: "default",
  },
  box: {
    borderWidth: border.size_2,
    borderColor: {
      default: color.borderControl,
      ":hover": {
        default: null,
        [pointer.canHover]: color.borderAccent,
      },
      ":checked": color.borderAccent,
      ":indeterminate": color.borderAccent,
      ":disabled": color.borderControl,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":checked": color.bgAccent,
      ":indeterminate": color.bgAccent,
      ":disabled": color.bgControlDisabled,
    },
    color: { default: color.fgOnAccent, ":disabled": color.fgMuted },
    [checkboxTokens.glyph]: {
      default: null,
      ":checked": `url("${CHECK_MASK}")`,
      ":indeterminate": `url("${DASH_MASK}")`,
    },
  },
  // The hover edge stays off a ticked box, which would ring the muted fill
  // in accent.
  done: {
    borderColor: {
      default: color.borderControl,
      ":hover": {
        default: null,
        [pointer.canHover]: color.borderAccent,
      },
      ":is(:checked, :indeterminate)": {
        default: color.fgMuted,
        ":hover": { default: null, [pointer.canHover]: color.fgMuted },
      },
      ":disabled": color.borderControl,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":checked": color.fgMuted,
      ":indeterminate": color.fgMuted,
      ":disabled": color.bgControlDisabled,
    },
  },
  readOnly: {
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: color.fgMuted,
    cursor: "default",
    // With no box around it, the tick or dash is the whole control, so it
    // takes the whole box. The dot is a mark on a line of text, which has the
    // same size on every screen while the box grows on touch. Thus its mask
    // is a fixed 1rem square, which gives a 6px dot at the default root.
    [checkboxTokens.glyphSize]: {
      default: `${space._3} ${space._3}`,
      ":checked": "100% 100%",
      ":indeterminate": "100% 100%",
    },
    [checkboxTokens.glyph]: {
      default: `url("${DOT_MASK}")`,
      ":checked": `url("${CHECK_MASK}")`,
      ":indeterminate": `url("${DASH_MASK}")`,
    },
  },
  boxError: {
    borderColor: {
      default: color.borderDanger,
      ":checked": color.borderDanger,
      ":indeterminate": color.borderDanger,
    },
    // Recolours the shared focus ring to danger, matching
    // TextField/Textarea/Select; composed after `a11y.focusRing`, so it wins.
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderDanger,
    },
  },
  labelText: {
    color: color.fg,
  },
});

const sizeStyles = stylex.create({
  sm: {
    inlineSize: controlSize._4,
    blockSize: controlSize._4,
  },
  md: {
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
  },
});

// The box of each size and the gap of `styles.row`, so that the description
// and the error start under the label, as on a `Switch`.
const underLabelStyles = stylex.create({
  sm: { paddingInlineStart: `calc(${controlSize._4} + ${controlSize._2})` },
  md: { paddingInlineStart: `calc(${controlSize._5} + ${controlSize._2})` },
});

const labelSizeRoles = {
  sm: typeRole.label,
  md: typeRole.control,
};
