"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, type ComponentProps, type ReactNode } from "react";
import { useRadioGroup } from "../hooks/use-radio-group.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { flex, grow, shrink } from "../primitives/flex.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { border, color, controlSize, font, space } from "../tokens.stylex.ts";
import { cardSurface } from "./card.stylex.ts";
import { optionCardSurface } from "./option-card.stylex.ts";

type OptionCardVariant = "row" | "tile";

/**
 * Whether the card is one of a mutually exclusive set or an independent
 * toggle. It is the card's ARIA role because the two are a real semantic
 * difference — a radio announces "one of N", a checkbox announces "on/off" —
 * not two looks.
 */
type OptionCardRole = "radio" | "checkbox";

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
 * selection indicator on a bordered surface. Renders a `<button>` and forwards
 * native button attributes, so spreading `useRadioGroup`'s `getOptionProps()`
 * onto it is all a bespoke group needs — this is the layer `OptionCardGroup`
 * drops to.
 *
 * The label alone names the card (`aria-labelledby`) and the description
 * describes it, so a long sublabel never ends up read as part of the name.
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
      // A caller's own name wins; otherwise the label element names the card so
      // the description and any bespoke children stay out of the name.
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

interface OptionCardGroupOption<TValue extends string> {
  /** The value this card selects. Must be unique within the group. */
  value: TValue;
  /** The card's primary text. */
  label: ReactNode;
  /** Supporting copy beneath the label. */
  description?: ReactNode;
  /** Decorative leading graphic, rendered `aria-hidden`. */
  icon?: ReactNode;
  /** Renders the card unselectable and skips it in keyboard navigation. */
  disabled?: boolean;
}

interface OptionCardGroupBaseProps<TValue extends string> extends Omit<
  ComponentProps<"div">,
  | "children"
  | "onChange"
  | "role"
  | "aria-label"
  | "aria-labelledby"
  | "className"
  | "style"
> {
  /** Ordered cards. Arrow-key navigation follows this order. */
  options: readonly OptionCardGroupOption<TValue>[];
  /** A stack of full-width rows, or a grid of centred tiles. */
  variant?: OptionCardVariant;
  /** StyleX overrides merged over the group — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * A group needs an accessible name (WCAG 1.3.1) — the card labels name the
 * options, never the group. Exactly one of `aria-label` / `aria-labelledby` is
 * required at the type level so an unnamed group cannot ship.
 */
type OptionCardGroupNaming =
  | { "aria-label": string; "aria-labelledby"?: undefined }
  | { "aria-labelledby": string; "aria-label"?: undefined };

type SingleSelectProps<TValue extends string> =
  OptionCardGroupBaseProps<TValue> &
    OptionCardGroupNaming & {
      /** Mutually exclusive cards. The default. */
      selection?: "single";
      /** The selected value. Must match one of `options`. */
      value: TValue;
      /** Called with the next value on click or keyboard select. */
      onChange: (next: TValue) => void;
    };

type MultipleSelectProps<TValue extends string> =
  OptionCardGroupBaseProps<TValue> &
    OptionCardGroupNaming & {
      /** Independently toggled cards. */
      selection: "multiple";
      /** The selected values, in any order. */
      value: readonly TValue[];
      /** Called with the next values whenever a card is toggled. */
      onChange: (next: TValue[]) => void;
    };

type OptionCardGroupProps<TValue extends string> =
  SingleSelectProps<TValue> | MultipleSelectProps<TValue>;

/**
 * The card-sized answer to a question: a group of `OptionCard`s driven by an
 * options array, single-select by default and `selection="multiple"` for
 * independent toggles. Use it where the choice deserves a tappable card rather
 * than a compact track (`SegmentedControl`) or a bare box (`Checkbox`).
 *
 * Single-select is a WAI-ARIA radiogroup built on `useRadioGroup` — roving
 * tabindex, arrow/Home/End, focus following selection — and skips disabled
 * cards. Multi-select is a plain group of checkboxes, each independently
 * tabbable, as the pattern requires.
 *
 * Controlled only. For a card carrying bespoke content, render `OptionCard`
 * yourself and drive it with `useRadioGroup` for the same keyboard model.
 */
export function OptionCardGroup<TValue extends string>(
  props: OptionCardGroupProps<TValue>,
) {
  // Two components rather than one branching body: `useRadioGroup` has no work
  // to do in multi-select, and a hook cannot be called conditionally.
  return props.selection === "multiple" ? (
    <MultipleSelectGroup {...props} />
  ) : (
    <SingleSelectGroup {...props} />
  );
}

function SingleSelectGroup<TValue extends string>({
  options,
  value,
  onChange,
  variant = "row",
  selection: _selection,
  css,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: SingleSelectProps<TValue>) {
  const { getOptionProps } = useRadioGroup({
    // Disabled cards stay rendered and announced but out of the arrow-key
    // order, so the keys can never land selection on one.
    values: options
      .filter((option) => option.disabled !== true)
      .map((option) => option.value),
    value,
    onChange,
  });

  return (
    <div
      {...restProps}
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={[groupStyles[variant], css]}
    >
      {options.map((option) => (
        <OptionCard
          key={option.value}
          {...getOptionProps(option.value)}
          selected={option.value === value}
          disabled={option.disabled}
          variant={variant}
          icon={option.icon}
          label={option.label}
          description={option.description}
        />
      ))}
    </div>
  );
}

function MultipleSelectGroup<TValue extends string>({
  options,
  value,
  onChange,
  variant = "row",
  selection: _selection,
  css,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...restProps
}: MultipleSelectProps<TValue>) {
  const selectedValues = new Set(value);

  return (
    <div
      {...restProps}
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      css={[groupStyles[variant], css]}
    >
      {options.map((option) => (
        <OptionCard
          key={option.value}
          role="checkbox"
          selected={selectedValues.has(option.value)}
          disabled={option.disabled}
          variant={variant}
          icon={option.icon}
          label={option.label}
          description={option.description}
          onClick={() => {
            onChange(
              selectedValues.has(option.value)
                ? value.filter((current) => current !== option.value)
                : [...value, option.value],
            );
          }}
        />
      ))}
    </div>
  );
}

/**
 * The default indicator: an empty ring or box at rest, a filled dot or tick
 * once selected. The mark appearing is the state change, so selection reads
 * without relying on the accent colour (WCAG 1.4.1).
 */
function SelectionMark({
  role,
  selected,
}: {
  role: OptionCardRole;
  selected: boolean;
}) {
  return (
    <span
      css={[
        flex.inlineCenter,
        shrink._0,
        markStyles.base,
        roleCornerStyles[role],
        selected && markStyles.selected,
      ]}
    >
      {selected && role === "radio" ? (
        <span css={[corner.radius_round, markStyles.dot]} />
      ) : null}
      {selected && role === "checkbox" ? (
        <svg viewBox="0 0 16 16" focusable="false" css={markStyles.tick}>
          <path
            d="M4 8.5l3 3 5-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

const groupStyles = stylex.create({
  row: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  tile: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
    gap: space._2,
  },
});

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
  // A second, quieter cue that the card is chosen, so the indicator is not the
  // only thing carrying it on a card whose icon dominates.
  iconSelected: {
    color: color.accentText,
  },
  text: {
    gap: space._0,
    // Let a long label wrap instead of forcing the card wider.
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

const markStyles = stylex.create({
  base: {
    boxSizing: "border-box",
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
    borderWidth: border.size_2,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    color: color.accentOn,
  },
  selected: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  dot: {
    inlineSize: "40%",
    blockSize: "40%",
    backgroundColor: color.accentOn,
  },
  tick: {
    inlineSize: "72%",
    blockSize: "72%",
  },
});

// `radio`/`checkbox` carried nothing but a radius, so they map straight to
// the `corner` primitive rather than composing it inside an otherwise-empty
// `markStyles` entry.
const roleCornerStyles = {
  radio: corner.radius_round,
  checkbox: corner.radius_1,
};
