"use client";

import * as stylex from "@stylexjs/stylex";
import {
  use,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { color } from "../color.stylex.ts";
import { EFFECT_CONTENT, EFFECT_OMIT } from "../effect-layer/effect-content.ts";
import { usePond } from "../effect-layer/use-pond.ts";
import { mergeRefs } from "../merge-refs.ts";
import { flex, grow, shrink } from "../primitives/flex.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { cardSurface } from "../surfaces/card.stylex.ts";
import { border, font, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { plateStyles } from "./option-card-plate.stylex.ts";
import {
  optionCardGroupMarker,
  optionCardMark,
  optionCardMarker,
  optionCardSurface,
} from "./option-card.stylex.ts";
import { SelectionMark } from "./selection-mark.tsx";
import { PRESS_SINK, useOptionCardPress } from "./use-option-card-press.ts";
import { PlateCardContext, PlateWindow } from "./use-plate-group.tsx";

export type OptionCardLook = "row" | "tile";

/** How many lines a description takes in a set of cards of the same height. */
export type OptionCardDescriptionLines = 1 | 2;

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
   * Decorative leading graphic, rendered `aria-hidden`.
   *
   * @zh 前置的装饰性图形，以 `aria-hidden` 渲染。
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
   * Whether the card is chosen. It sets `aria-checked` when `role` is set, and
   * `aria-pressed` when it is not, and the look follows that attribute. Leave
   * it out for a card that only acts when pressed, so it is not a toggle.
   *
   * @zh 卡片是否已选中。设置了 `role` 时它提供 `aria-checked`，未设置时提供 `aria-pressed`，外观随该属性变化。若卡片只是按下即执行动作，则不要传入，以免它成为切换按钮。
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
  selected,
  look = "row",
  children,
  role,
  type = "button",
  disabled,
  css,
  ref,
  "aria-checked": ariaChecked,
  "aria-pressed": ariaPressed,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
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

  const plate = use(PlateCardContext);
  const cardRef = useRef<HTMLButtonElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const press = useOptionCardPress({
    cardRef,
    disabled: disabled ?? false,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  });
  const pond = usePond({ pressDelay: PRESS_SINK });
  // A key that changes the selection gives no pointer press, so the stone
  // drops at the mark.
  const dropAtMark = useEffectEvent(() => {
    if (
      document.activeElement === cardRef.current &&
      !press.pressedSinceKey()
    ) {
      pond.dropAtCentreOf(markRef.current);
    }
  });
  const selectedBeforeRef = useRef(selected);
  useLayoutEffect(() => {
    if (selectedBeforeRef.current === selected) return;
    selectedBeforeRef.current = selected;
    dropAtMark();
  }, [selected]);

  const resolvedIndicator =
    indicator === undefined
      ? role && (
          <SelectionMark
            role={role}
            selected={plate ? plate.arrived : (selected ?? false)}
            fillGrows={plate !== null}
          />
        )
      : indicator;

  return (
    <button
      {...restProps}
      {...press.handlers}
      ref={mergeRefs(ref, cardRef, pond.ref, plate?.ref)}
      {...{ [EFFECT_CONTENT]: "" }}
      type={type}
      role={role}
      disabled={disabled}
      aria-checked={ariaChecked ?? (role && (selected ?? false))}
      aria-pressed={ariaPressed ?? (role === undefined ? selected : undefined)}
      aria-label={ariaLabel}
      // A caller's own name wins; otherwise the label names the card, keeping
      // the description and any children out of it.
      aria-labelledby={
        ariaLabelledBy ?? (ariaLabel === undefined ? labelId : undefined)
      }
      aria-describedby={describedBy === "" ? undefined : describedBy}
      css={[
        typeRole.body,
        buttonReset.base,
        cardSurface.base,
        cardSurface.interactive,
        optionCardSurface.base,
        plate && plateStyles.facade,
        plate && (plate.arrived ? plateStyles.frameArrived : plateStyles.frame),
        optionCardMarker,
        styles[look],
        Boolean(resolvedIndicator) &&
          (look === "row" ? styles.rowWithIndicator : styles.tileWithIndicator),
        css,
      ]}
    >
      {plate?.windowed ? <PlateWindow plate={plate} /> : null}
      {icon ? (
        <span
          css={[
            flex.inlineCenter,
            shrink._0,
            styles.icon,
            look === "row" && styles.titleLine,
            styles.pondContent,
          ]}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span
        css={[
          stack.text,
          grow._1,
          styles.text,
          look === "tile" && styles.tileText,
          styles.pondContent,
        ]}
      >
        <span
          id={labelId}
          css={[typeRole.bodySmall, styles.label, styles.labelLines]}
        >
          {label}
        </span>
        {hasDescription ? (
          <span
            id={descriptionId}
            css={[
              typeRole.bodySmall,
              styles.description,
              styles.descriptionLines,
            ]}
          >
            {description}
          </span>
        ) : null}
        {children}
      </span>
      {resolvedIndicator ? (
        <span
          ref={markRef}
          css={[
            styles.indicator,
            look === "row" ? styles.indicatorRow : styles.indicatorTile,
          ]}
          aria-hidden
          // The mark animates when the selection changes, and a snapshot
          // cannot follow that motion. Thus the page draws the mark, and
          // the pond does not bend it.
          {...{ [EFFECT_OMIT]: "" }}
        >
          {resolvedIndicator}
        </span>
      ) : null}
    </button>
  );
}

export { OptionCardGroup } from "./option-card-group.tsx";
export { OptionCardStack } from "./option-card-stack.tsx";

// The label's line box: `typeRole.bodySmall` is `uiBodySmall × lineHeightBody`.
const labelLineBox = `calc(${font.uiBodySmall} * ${font.lineHeightBody})`;

// `OptionCardStack` sets this attribute when its cards have the same height.
const EQUAL = "[data-description-lines]";
const ONE_LINE = "[data-description-lines='1']";
const TWO_LINES = "[data-description-lines='2']";
// The effect layer sets this attribute on the card while its pond draws the
// content.
const CONTENT_DRAWN_BY_POND = ":is([data-effect-content-drawn])";

// The mark has two placements. A tile, and a row by default, put the mark in
// the top-end corner: its centre is the centre of the card's corner arc. The
// marks then align from card to card when the heights are different. A row in a
// group that sets `descriptionLines` puts the mark at the vertical centre of
// the card.
const cornerCentre = `calc(${optionCardMark.cornerCentre} - ${border.size_1})`;
const markEdgeInset = `calc(${cornerCentre} - ${optionCardMark.size} / 2)`;
const cornerPaddingStart = `calc(${cornerCentre} - ${labelLineBox} / 2)`;
const centredPadding = `calc((${cornerPaddingStart} + ${space._1}) / 2)`;

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
    textAlign: "center",
  },
  // In the corner placement, the label's first line centres on the corner
  // centre, beside the indicator.
  rowWithIndicator: {
    paddingBlockStart: {
      default: cornerPaddingStart,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: centredPadding,
    },
    paddingBlockEnd: {
      default: space._1,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: centredPadding,
    },
    paddingInlineEnd: markEdgeInset,
  },
  // The indicator sits in the corner, out of the flow, so the same space on
  // both sides keeps the label clear of it and centred.
  tileWithIndicator: {
    paddingInline: `calc(${cornerCentre} + ${optionCardMark.size} / 2 + ${rhythm.tight})`,
  },
  icon: {
    color: color.fgMuted,
  },
  text: {
    minInlineSize: 0,
  },
  // A tile is narrow, so a word longer than the tile breaks rather than run
  // out of the tile and under the indicator.
  tileText: {
    overflowWrap: "anywhere",
  },
  // Haffer has no 500 face, so a medium weight shows as 400. Use 600.
  label: {
    fontWeight: font.weight_6,
  },
  description: {
    color: color.fgMuted,
  },
  // `truncate.base` cannot apply only under an ancestor, so these are its
  // values.
  labelLines: {
    overflow: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "hidden",
    },
    textOverflow: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "ellipsis",
    },
    whiteSpace: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "nowrap",
    },
  },
  // A short description keeps the height of the full line count, so that the
  // labels align from card to card.
  descriptionLines: {
    display: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "-webkit-box",
    },
    WebkitBoxOrient: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "vertical",
    },
    WebkitLineClamp: {
      default: null,
      [stylex.when.ancestor(ONE_LINE, optionCardGroupMarker)]: 1,
      [stylex.when.ancestor(TWO_LINES, optionCardGroupMarker)]: 2,
    },
    overflow: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "hidden",
    },
    overflowWrap: {
      default: null,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "anywhere",
    },
    minBlockSize: {
      default: null,
      [stylex.when.ancestor(ONE_LINE, optionCardGroupMarker)]: labelLineBox,
      [stylex.when.ancestor(TWO_LINES, optionCardGroupMarker)]:
        `calc(2 * ${labelLineBox})`,
    },
  },
  // The content snapshot does not copy `filter`, so the pond still draws
  // the content that this hides.
  pondContent: {
    filter: {
      default: null,
      [stylex.when.ancestor(CONTENT_DRAWN_BY_POND, optionCardMarker)]:
        "opacity(0)",
    },
  },
  indicator: {
    display: "inline-flex",
    flexShrink: 0,
    alignSelf: "center",
  },
  // A row's icon centres on the label's first line, not on the card, so it
  // stays beside the label when the description wraps.
  titleLine: {
    alignSelf: "flex-start",
    alignItems: "center",
    minBlockSize: labelLineBox,
  },
  indicatorRow: {
    alignItems: "center",
    alignSelf: {
      default: "flex-start",
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: "center",
    },
    minBlockSize: {
      default: labelLineBox,
      [stylex.when.ancestor(EQUAL, optionCardGroupMarker)]: null,
    },
  },
  // A tile stacks its content, so the indicator moves out of the flow and into
  // the corner rather than sitting under the label.
  indicatorTile: {
    position: "absolute",
    insetBlockStart: markEdgeInset,
    insetInlineEnd: markEdgeInset,
  },
});
