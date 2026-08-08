"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { useDisclosure } from "../hooks/use-disclosure.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { border, color, font, space } from "../tokens.stylex.ts";
import { cardSurface } from "./card.stylex.ts";

type DisclosureVariant = "plain" | "card";

/**
 * Default caret. Same 256 viewBox and round-capped stroke recipe as Callout's
 * icons, so a caller can swap in a Phosphor icon without a size jump. `1em`
 * box scales with the inherited font-size.
 */
function CaretIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="none">
      <path
        d="M208 96 128 176 48 96"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface DisclosureBaseProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style"
> {
  /**
   * Header content — the whole row is the trigger, so keep this text and
   * decoration only. Anything interactive would nest a control inside a button;
   * drop to the `useDisclosure` hook for a header that holds its own link.
   */
  summary: ReactNode;
  /** Panel content, revealed when open. */
  children: ReactNode;
  /** Decorative leading icon in the header, rendered `aria-hidden`. */
  icon?: ReactNode;
  /**
   * Content between the summary and the caret — a count, a status badge. It
   * stays in the accessibility tree, so it reads as part of the trigger's name
   * (matching Chip's slot of the same name); a count no one can hear is a count
   * that only half the audience gets. Rendered inside the trigger, so it must
   * not be interactive.
   */
  trailing?: ReactNode;
  /**
   * The open/closed indicator. Defaults to a caret that rotates on open; pass a
   * node to swap it, or `null` to drop it.
   */
  indicator?: ReactNode;
  /**
   * `"plain"` (the default) is chrome-free — a trigger row and a panel, for a
   * disclosure that sits inside a surface something else already owns.
   * `"card"` wraps both in the shared bordered card surface and rules the panel
   * off from the header.
   */
  variant?: DisclosureVariant;
  /** StyleX overrides merged over the root — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * A controlled disclosure whose parent never hears about the toggle is a dead
 * control: `useControlled` hands back a no-op setter while `open` is supplied,
 * so without `onOpenChange` nothing can ever change the state. The two travel
 * together at the type level so that can't ship.
 */
type DisclosureStateProps =
  | {
      /** Controlled open state. Requires `onOpenChange`. */
      open: boolean;
      /** Called with the next state whenever the trigger toggles. */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: undefined;
    }
  | {
      open?: undefined;
      /** Called with the next state whenever the trigger toggles. */
      onOpenChange?: (open: boolean) => void;
      /** Initial open state when uncontrolled. Defaults to `false`. */
      defaultOpen?: boolean;
    };

type DisclosureProps = DisclosureBaseProps & DisclosureStateProps;

/**
 * An expand/collapse section: a header row that toggles a panel beneath it,
 * wired with `aria-expanded` and `aria-controls`. The panel stays mounted and
 * flips `hidden`, so it keeps its state across toggles and `aria-controls`
 * always resolves — render expensive contents (an iframe, a map) conditionally
 * yourself if you need them deferred.
 *
 * The trigger's font-size is inherited from the root, so one `css` override
 * resizes the whole header. Forwards native `<div>` attributes (`id`, `data-*`,
 * `ref`) on the root for escape-hatch composition.
 */
export function Disclosure({
  summary,
  children,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  icon,
  trailing,
  indicator,
  variant = "plain",
  css,
  ref,
  ...restProps
}: DisclosureProps) {
  const { open, triggerProps, panelProps } = useDisclosure({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
  });
  const resolvedIndicator = indicator === undefined ? <CaretIcon /> : indicator;

  return (
    <div
      {...restProps}
      ref={ref}
      css={[styles.root, variant === "card" && cardSurface.base, css]}
    >
      <button
        {...triggerProps}
        css={[
          buttonReset.base,
          a11y.focusRingInset,
          styles.trigger,
          triggerVariants[variant],
        ]}
      >
        {icon ? (
          <span css={styles.slot} aria-hidden>
            {icon}
          </span>
        ) : null}
        <span css={styles.summary}>{summary}</span>
        {trailing ? <span css={styles.trailing}>{trailing}</span> : null}
        {/* Truthiness, so `indicator={hasChildren && <Icon />}` collapses the
            slot entirely on a leaf row rather than leaving an empty 1em box
            that pushes its summary out of line with its siblings'. */}
        {resolvedIndicator ? (
          <span
            css={[
              styles.slot,
              transition.transform,
              open && styles.indicatorOpen,
            ]}
            aria-hidden
          >
            {resolvedIndicator}
          </span>
        ) : null}
      </button>
      <div {...panelProps} css={panelVariants[variant]}>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    fontSize: font.uiBodySmall,
  },
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    inlineSize: "100%",
    // Inherited so the root's `fontSize` (and any `css` override of it) drives
    // the header, the slots, and the caret together.
    fontSize: "inherit",
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_3,
    color: color.textMain,
    textAlign: "start",
    borderRadius: border.radius_2,
  },
  // `em` boxes so every icon tracks the header's font-size.
  slot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
    color: color.textMuted,
  },
  summary: {
    flexGrow: 1,
    // Let long summaries wrap instead of forcing the trigger wider.
    minInlineSize: 0,
  },
  trailing: {
    flexShrink: 0,
    color: color.textMuted,
  },
  indicatorOpen: {
    transform: "rotate(180deg)",
  },
});

const triggerVariants = stylex.create({
  plain: {
    paddingBlock: space._1,
  },
  card: {
    paddingBlock: space._2,
    paddingInline: space._3,
  },
});

// No `display` here: the panel leans on the `hidden` attribute to collapse, and
// any `display` declaration would override the browser's `[hidden]` rule.
const panelVariants = stylex.create({
  plain: {
    paddingBlockEnd: space._1,
  },
  card: {
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
});
