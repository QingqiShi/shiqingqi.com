"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { flex, grow, shrink } from "../../primitives/flex.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import { buttonReset } from "../../primitives/reset.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import { color, font, space } from "../../tokens.stylex.ts";
import { cardSurface } from "../surfaces/card.stylex.ts";
import { optionCardSurface } from "./option-card.stylex.ts";
import { SelectionMark } from "./selection-mark.tsx";

export type OptionCardVariant = "row" | "tile";

/**
 * Whether the card is one of a mutually exclusive set or an independent
 * toggle. It is the card's ARIA role because the two are a real semantic
 * difference — a radio announces "one of N", a checkbox announces "on/off" —
 * not two looks.
 */
export type OptionCardRole = "radio" | "checkbox";

interface OptionCardOwnProps {
  /** The card's primary text, and its accessible name on its own. */
  label: ReactNode;
  /** Supporting copy beneath the label, wired up as the card's description. */
  description?: ReactNode;
  /** Decorative leading graphic, rendered `aria-hidden`. */
  icon?: ReactNode;
  /**
   * Replaces the selection indicator, which defaults to a radio dot or a
   * checkbox tick following `role`. Pass `null` for a card with no indicator.
   */
  indicator?: ReactNode;
  /** Paints the card as chosen, and supplies `aria-checked` when `role` is set. */
  selected?: boolean;
  /** A full-width row, or a centred tile for a grid of small cards. */
  variant?: OptionCardVariant;
  /** Bespoke content under the description — the drop-a-layer escape hatch. */
  children?: ReactNode;
  /** StyleX styles merged over the card — composed last so a caller wins. */
  css?: StyleProp;
}

type OptionCardProps = OptionCardOwnProps &
  Omit<
    ComponentProps<"button">,
    "children" | "role" | "className" | "style"
  > & {
    /** Selection semantics. Omit for a card that merely acts when pressed. */
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
  variant = "row",
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
        styles[variant],
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
          css={[styles.indicator, variant === "tile" && styles.indicatorTile]}
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
