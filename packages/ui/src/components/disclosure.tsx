"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { useDisclosure } from "../hooks/use-disclosure.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { border, color, font, space } from "../tokens.stylex.ts";
import { cardSurface } from "./card.stylex.ts";
import { DisclosureCaretIcon } from "./disclosure-caret-icon.tsx";

type DisclosureVariant = "plain" | "card";

interface DisclosureBaseProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style"
> {
  /**
   * Header content — the whole row is the trigger, so keep this text and
   * decoration only. Drop to the `useDisclosure` hook for a header that holds
   * its own link, which would nest a control inside a button.
   */
  summary: ReactNode;
  /** Panel content, revealed when open. */
  children: ReactNode;
  /** Decorative leading icon in the header, rendered `aria-hidden`. */
  icon?: ReactNode;
  /**
   * Content between the summary and the caret — a count, a status badge. It
   * stays in the accessibility tree, so it reads as part of the trigger's name
   * and must not be interactive.
   */
  trailing?: ReactNode;
  /**
   * The open/closed indicator. Defaults to a caret that rotates on open; pass a
   * node to swap it, or `null` to drop it.
   */
  indicator?: ReactNode;
  /**
   * `"plain"` (the default) is chrome-free, for a disclosure that sits inside a
   * surface something else already owns. `"card"` wraps both parts in the shared
   * bordered card surface and rules the panel off from the header.
   */
  variant?: DisclosureVariant;
  /** StyleX overrides merged over the root — composed last so a caller wins. */
  css?: StyleProp;
}

/**
 * `useControlled` hands back a no-op setter while `open` is supplied, so a
 * controlled disclosure without `onOpenChange` is a dead control. The two
 * travel together at the type level so that cannot ship.
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
 * flips `hidden`, so render expensive contents conditionally yourself if you
 * need them deferred.
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
  const resolvedIndicator =
    indicator === undefined ? <DisclosureCaretIcon /> : indicator;

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
          corner.radius_2,
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
        {/* Truthiness, so `indicator={hasChildren && <Icon />}` drops the slot
            on a leaf row instead of leaving an empty box that misaligns the
            summary. */}
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

// No `display` here: the panel leans on `[hidden]` to collapse, and any
// `display` value here would override that browser rule.
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
