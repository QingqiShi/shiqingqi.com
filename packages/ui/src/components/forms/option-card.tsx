"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { flex, grow, shrink } from "../../primitives/flex.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import { buttonReset } from "../../primitives/reset.stylex.ts";
import { color, font, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { cardSurface } from "../surfaces/card.stylex.ts";
import { optionCardSurface } from "./option-card.stylex.ts";
import { SelectionMark } from "./selection-mark.tsx";

export type OptionCardLook = "row" | "tile";

/**
 * Whether the card is one of a mutually exclusive set or an independent
 * toggle. It is the card's ARIA role because the two are a real semantic
 * difference — a radio announces "one of N", a checkbox announces "on/off" —
 * not two looks.
 */
export type OptionCardRole = "radio" | "checkbox";

interface OptionCardOwnProps {
  /**
   * The card's primary text, and its accessible name on its own — nothing
   * else in the card joins the name.
   *
   * @zh 卡片的主文本，并单独构成其可访问名称——卡片内的其他内容都不会加入该名称。
   */
  label: ReactNode;
  /**
   * Supporting copy beneath the label, attached as the card's description via
   * `aria-describedby`.
   *
   * @zh 标签下方的辅助说明，通过 `aria-describedby` 关联为卡片的描述。
   */
  description?: ReactNode;
  /**
   * Decorative leading graphic, rendered `aria-hidden`. Tints to the accent
   * colour once the card is selected.
   *
   * @zh 前置的装饰性图形，以 `aria-hidden` 渲染。卡片被选中后会染上强调色。
   */
  icon?: ReactNode;
  /**
   * Replaces the selection indicator, which defaults to a radio dot or a
   * checkbox tick following `role`. Pass `null` for a card with no indicator.
   *
   * @zh 替换选中指示符，默认依据 `role` 呈现为单选圆点或复选勾号，传入 `null` 则完全不显示指示符。
   */
  indicator?: ReactNode;
  /**
   * Paints the card as chosen, and supplies `aria-checked` when `role` is set.
   *
   * @zh 把卡片绘制为已选中状态；设置了 `role` 时同时提供 `aria-checked`。
   */
  selected?: boolean;
  /**
   * A full-width row, or a centred tile for a grid of small cards.
   *
   * @zh 撑满宽度的行，或用于小卡片网格的居中方块。
   */
  look?: OptionCardLook;
  /**
   * Bespoke content under the description — the escape hatch to the custom
   * layer. It stays out of the accessible name.
   *
   * @zh 说明下方的自定义内容——通往自定义层的逃生舱口，不会进入可访问名称。
   */
  children?: ReactNode;
  /**
   * StyleX styles merged over the card — composed last so a caller wins.
   *
   * @zh 合并到卡片上的 StyleX 样式，最后合成，使调用方可覆盖。
   */
  css?: StyleProp;
}

type OptionCardProps = OptionCardOwnProps &
  Omit<
    ComponentProps<"button">,
    "children" | "role" | "className" | "style"
  > & {
    /**
     * Selection semantics, and the difference a screen reader hears: a radio
     * announces "one of N", a checkbox "on/off". Omit for a card that merely
     * acts when pressed.
     *
     * @zh 选择语义，也是屏幕阅读器听到的差别：单选项朗读为“N 选一”，复选框朗读为“开/关”。若卡片只是按下即执行动作，则不要设置。
     */
    role?: OptionCardRole;
  };

/**
 * One card-sized selectable control: an icon, a label, a description, and a
 * selection indicator on a bordered surface. Renders a `<button>` that
 * forwards native attributes, so spreading `useRadioGroup`'s
 * `getOptionProps()` onto it is enough to drive a bespoke group.
 */
export function OptionCard({
  label,
  description,
  icon,
  indicator,
  selected = false,
  look = "row",
  children,
  role,
  type = "button",
  disabled,
  css,
  ref,
  "aria-checked": ariaChecked,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...restProps
}: OptionCardProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const hasDescription = Boolean(description);

  const describedBy = [
    ariaDescribedBy,
    hasDescription ? descriptionId : undefined,
  ]
    .filter((value) => value !== undefined)
    .join(" ");

  const resolvedIndicator =
    indicator === undefined
      ? role && <SelectionMark role={role} selected={selected} />
      : indicator;

  return (
    <button
      {...restProps}
      ref={ref}
      type={type}
      role={role}
      disabled={disabled}
      aria-checked={ariaChecked ?? (role && selected)}
      aria-label={ariaLabel}
      // A caller's own name wins; otherwise the label names the card, keeping
      // the description and any children out of it.
      aria-labelledby={
        ariaLabelledBy ?? (ariaLabel === undefined ? labelId : undefined)
      }
      aria-describedby={describedBy === "" ? undefined : describedBy}
      css={[
        buttonReset.base,
        cardSurface.base,
        cardSurface.interactive,
        transition.colors,
        optionCardSurface.base,
        styles[look],
        selected && optionCardSurface.selected,
        disabled === true && optionCardSurface.disabled,
        css,
      ]}
    >
      {icon ? (
        <span
          css={[
            flex.inlineCenter,
            shrink._0,
            styles.icon,
            selected && styles.iconSelected,
          ]}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span css={[flex.col, grow._1, styles.text]}>
        <span id={labelId} css={styles.label}>
          {label}
        </span>
        {hasDescription ? (
          <span id={descriptionId} css={styles.description}>
            {description}
          </span>
        ) : null}
        {children}
      </span>
      {resolvedIndicator ? (
        <span
          css={[styles.indicator, look === "tile" && styles.indicatorTile]}
          aria-hidden
        >
          {resolvedIndicator}
        </span>
      ) : null}
    </button>
  );
}

export { OptionCardGroup } from "./option-card-group.tsx";

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._3,
    paddingBlock: space._2,
    paddingInline: space._3,
    fontSize: font.uiBody,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._2,
    fontSize: font.uiBody,
    textAlign: "center",
  },
  icon: {
    color: color.textMuted,
  },
  // A quieter second cue that the card is chosen, so color isn't the icon's
  // only signal.
  iconSelected: {
    color: color.accentText,
  },
  text: {
    gap: space._0,
    minInlineSize: 0,
  },
  label: {
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_2,
  },
  description: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_3,
  },
  indicator: {
    display: "inline-flex",
    flexShrink: 0,
    alignSelf: "center",
  },
  // A tile stacks its content, so the indicator moves out of the flow and into
  // the corner rather than sitting under the label.
  indicatorTile: {
    position: "absolute",
    insetBlockStart: space._1,
    insetInlineEnd: space._1,
  },
});
