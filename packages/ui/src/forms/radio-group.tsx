import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { border, controlSize } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { checkboxMark, checkboxTokens } from "./checkbox.stylex.ts";
import { fieldStyles } from "./field-shared.stylex.ts";

const DOT_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Ccircle%20cx='8'%20cy='8'%20r='5'%20fill='black'/%3E%3C/svg%3E";

interface RadioGroupOption<TValue extends string> {
  /**
   * The value this option picks, sent with the form under the group's
   * `name`. Must be unique within the group.
   *
   * @zh 该选项选中的值，随表单以组的 `name` 提交。在组内必须唯一。
   */
  value: TValue;
  /**
   * The option's name, beside its mark.
   *
   * @zh 选项的名称，显示在标记旁。
   */
  label: ReactNode;
  /**
   * A muted line under the label, attached to the option with
   * `aria-describedby`.
   *
   * @zh 标签下方的弱化说明，通过 `aria-describedby` 关联到该选项。
   */
  description?: ReactNode;
  /**
   * Shows the option but lets nobody pick it.
   *
   * @zh 显示该选项，但不可选择。
   */
  disabled?: boolean;
}

type RadioGroupNaming =
  | {
      /**
       * Names the group. Required unless `aria-labelledby` is given, because
       * the labels name the options, never the group.
       *
       * @zh 为该组命名。除非提供 `aria-labelledby`，否则必填，因为各标签只命名选项，不命名整个组。
       */
      "aria-label": string;
      "aria-labelledby"?: undefined;
    }
  | {
      /**
       * The id of a visible element that names the group, usually the
       * question above it, such as a `CardTitle`.
       *
       * @zh 为该组命名的可见元素 id，通常是其上方的问题，例如 `CardTitle`。
       */
      "aria-labelledby": string;
      "aria-label"?: undefined;
    };

type RadioGroupProps<TValue extends string> = Omit<
  ComponentProps<"div">,
  | "children"
  | "onChange"
  | "defaultValue"
  | "role"
  | "aria-label"
  | "aria-labelledby"
  | "className"
  | "style"
> &
  RadioGroupNaming & {
    /**
     * The options in order. The arrow keys move through them in this order,
     * and skip a disabled one.
     *
     * @zh 按顺序排列的选项。方向键按此顺序移动，并跳过被禁用的选项。
     */
    options: readonly RadioGroupOption<TValue>[];
    /**
     * The name that the radios share, under which a form sends the picked
     * value. Defaults to a generated one.
     *
     * @zh 各单选按钮共用的名称，表单以此名称提交选中的值。默认自动生成。
     */
    name?: string;
    /**
     * The picked value, for a group that the parent controls. Give
     * `onChange` with it.
     *
     * @zh 选中的值，用于由父组件控制的组。需同时提供 `onChange`。
     */
    value?: TValue;
    /**
     * The value picked at first, for a group that keeps its own state, such
     * as one that a form reads when it is sent.
     *
     * @zh 初始选中的值，用于自行保存状态的组，例如在提交时由表单读取的组。
     */
    defaultValue?: TValue;
    /**
     * Called with the value the visitor picks.
     *
     * @zh 访客选择某个值时调用，参数为该值。
     */
    onChange?: (next: TValue) => void;
    /**
     * StyleX styles merged over the group, composed last.
     *
     * @zh 合并到该组上的 StyleX 样式，最后合成。
     */
    css?: StyleProp;
  };

/**
 * A plain list of radios for one choice of a few: a round mark, a label and
 * an optional description per option, with no card around each. It is built
 * on native `<input type="radio">`s that share one `name`, so the browser
 * gives the arrow keys and a form sends the value. For a choice that needs
 * an icon or more weight, use `OptionCardGroup`.
 */
export function RadioGroup<TValue extends string>({
  options,
  name,
  value,
  defaultValue,
  onChange,
  css,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: RadioGroupProps<TValue>) {
  const id = useId();
  const groupName = name ?? id;

  return (
    <div
      {...restProps}
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={[stack.tight, css]}
    >
      {options.map((option, index) => {
        const descriptionId = `${id}-${String(index)}-description`;
        const hasDescription =
          option.description !== undefined && option.description !== null;
        return (
          <span key={option.value} css={stack.text}>
            <label
              css={[
                flex.row,
                styles.row,
                option.disabled === true && styles.rowDisabled,
              ]}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={
                  value === undefined ? undefined : option.value === value
                }
                defaultChecked={
                  value === undefined
                    ? option.value === defaultValue
                    : undefined
                }
                disabled={option.disabled}
                aria-describedby={hasDescription ? descriptionId : undefined}
                onChange={
                  onChange === undefined
                    ? undefined
                    : () => {
                        onChange(option.value);
                      }
                }
                css={[
                  a11y.focusRing,
                  transition.colors,
                  corner.radius_round,
                  checkboxMark.base,
                  styles.mark,
                ]}
              />
              <span css={[typeRole.control, styles.label]}>{option.label}</span>
            </label>
            {hasDescription ? (
              <span
                id={descriptionId}
                css={[
                  typeRole.bodySmall,
                  fieldStyles.description,
                  styles.description,
                ]}
              >
                {option.description}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

// The mark draws as the radio of an `OptionCard` does: an empty ring at rest,
// and a heavier ring in `fg` around a dot in `fg` when it is picked. The dot
// is the `Checkbox` glyph, with a dot in place of the tick.
const styles = stylex.create({
  row: {
    gap: controlSize._2,
    cursor: "pointer",
  },
  rowDisabled: {
    cursor: "not-allowed",
  },
  mark: {
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
    borderWidth: { default: border.size_1, ":checked": border.size_2 },
    borderColor: {
      default: color.borderControl,
      ":hover": {
        default: null,
        [pointer.canHover]: color.borderAccent,
      },
      ":checked": color.fg,
      ":disabled": color.borderControl,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":disabled": color.bgControlDisabled,
    },
    color: color.fg,
    [checkboxTokens.glyph]: {
      default: null,
      ":checked": `url("${DOT_MASK}")`,
    },
    [checkboxTokens.glyphSize]: "100% 100%",
  },
  label: {
    color: color.fg,
  },
  // The width of the mark and the gap of the row, so that the description
  // starts under the label.
  description: {
    paddingInlineStart: `calc(${controlSize._5} + ${controlSize._2})`,
  },
});
