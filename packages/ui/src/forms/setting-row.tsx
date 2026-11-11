"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { isShown } from "../is-shown.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { font, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  SettingRowContext,
  type SettingRowControl,
} from "./setting-row-context.ts";
import { settingRowTokens } from "./setting-row.stylex.ts";

interface SettingRowProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "css"
> {
  /**
   * The setting's name, at the start of the row. It is the `<label>` of the
   * control: a `Switch` or a `Select` without a `label` of its own takes it as
   * its name, and a click on it toggles a `Switch`.
   *
   * @zh 设置项的名称，位于行首。它是控件的 `<label>`：没有自身 `label` 的 `Switch` 或 `Select` 以它为名称，点击它也会切换 `Switch`。
   */
  label: ReactNode;
  /**
   * What the setting changes, in muted text under the name. The control
   * takes it as its description through `aria-describedby`.
   *
   * @zh 说明这个设置会改变什么，以弱化文字显示在名称下方。控件通过 `aria-describedby` 把它作为自身的描述。
   */
  description?: ReactNode;
  /**
   * The one control at the end of the row, such as a `Switch` or a `Select`
   * without a `label`, or a `Button`. Where the row is too narrow for the
   * name and the control side by side, the control moves under the name.
   *
   * @zh 行尾的唯一控件，例如没有 `label` 的 `Switch` 或 `Select`，或一个 `Button`。行宽不足以让名称与控件并排时，控件移到名称下方。
   */
  control?: ReactNode;
  /**
   * Content that depends on the setting, under the name and lined up with
   * it, such as the field for a folder name under the switch that turns the
   * folder on. Give each field in it a label of its own.
   *
   * @zh 依赖于该设置的内容，位于名称下方并与名称对齐，例如在开启文件夹的开关下方填写文件夹名称的字段。其中每个字段都应有自己的标签。
   */
  children?: ReactNode;
  /**
   * StyleX styles merged over the row's own — the config-layer escape hatch.
   *
   * @zh 合并在行自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * One setting: its name and description at the start, the control that
 * changes it at the end, and what depends on it underneath. The name is the
 * control's label. Put several rows in a `SettingList` to divide them.
 */
export function SettingRow({
  label,
  description,
  control,
  children,
  css,
  ...rest
}: SettingRowProps) {
  const id = useId();
  const controlId = `${id}-control`;
  const descriptionId = `${id}-description`;
  const hasDescription = isShown(description);
  const rowControl: SettingRowControl = {
    id: controlId,
    descriptionId: hasDescription ? descriptionId : undefined,
  };

  return (
    <div {...rest} css={[styles.row, css]}>
      <div css={[stack.text, styles.text]}>
        <label htmlFor={controlId} css={[typeRole.body, styles.label]}>
          {label}
        </label>
        {hasDescription ? (
          <span id={descriptionId} css={[typeRole.bodySmall, styles.muted]}>
            {description}
          </span>
        ) : null}
      </div>
      {isShown(control) ? (
        <div css={styles.control}>
          <SettingRowContext value={rowControl}>{control}</SettingRowContext>
        </div>
      ) : null}
      {isShown(children) ? (
        <div css={[stack.item, styles.dependent]}>{children}</div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: rhythm.item,
    rowGap: rhythm.tight,
    minInlineSize: 0,
    borderBlockStartWidth: {
      default: settingRowTokens.divider,
      ":first-child": 0,
    },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    paddingBlockStart: {
      default: settingRowTokens.paddingBlock,
      ":first-child": 0,
    },
    paddingBlockEnd: {
      default: settingRowTokens.paddingBlock,
      ":last-child": 0,
    },
  },
  // Wide enough for a name of a few words. Below it, the control wraps under
  // the name, so a Select is not squeezed on a phone.
  text: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "14rem",
    minInlineSize: 0,
  },
  label: {
    fontWeight: font.weight_5,
    color: color.fg,
  },
  muted: {
    color: color.fgMuted,
  },
  control: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    maxInlineSize: "100%",
  },
  // A row inside this content is not a row of the list around it.
  dependent: {
    flexBasis: "100%",
    minInlineSize: 0,
    paddingBlockStart: rhythm.tight,
    [settingRowTokens.divider]: "0px",
    [settingRowTokens.paddingBlock]: "0px",
  },
});

export { SettingList } from "./setting-list.tsx";
