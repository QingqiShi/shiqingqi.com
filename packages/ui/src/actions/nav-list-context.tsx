import * as stylex from "@stylexjs/stylex";
import { createContext, type ComponentProps, type ComponentType } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { selectedTokens } from "../primitives/selected.stylex.ts";
import {
  color,
  controlHeight,
  controlSize,
  font,
  rhythm,
  space,
} from "../tokens.stylex.ts";
import type { NavListMotion } from "./create-nav-list-motion.ts";
import { navListTokens } from "./nav-list.stylex.ts";

/**
 * The contract of the link Slot: `href`, `children`, `className`, `style` and
 * `aria-current` have to reach the rendered anchor.
 *
 * @internal
 */
export interface NavListLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** @internal */
export function PlainAnchor(props: NavListLinkProps) {
  return <a {...props} />;
}

interface NavListContextValue {
  /** Whether the rows are in a `NavGroup`. */
  nested: boolean;
  linkComponent: ComponentType<NavListLinkProps>;
  /** The marker and the hover fill of the list, or `null` outside one. */
  motion: NavListMotion | null;
}

/** @internal */
export const NavListContext = createContext<NavListContextValue>({
  nested: false,
  linkComponent: PlainAnchor,
  motion: null,
});

/** @internal */
export const navListStyles = stylex.create({
  rowInset: {
    paddingInline: navListTokens.rowInset,
  },
  /**
   * The look of a row that takes an action: a `NavLink`, or the button of a
   * group in a group. Compose it after `a11y.touchRow`, because it sets the
   * height for each pointer.
   */
  rowControl: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    minBlockSize: { default: controlHeight.sm, [pointer.coarse]: "44px" },
    paddingBlock: space._0,
    [selectedTokens.rest]: {
      default: "transparent",
      ":active": color.bgControlPressed,
    },
    color: color.fg,
    fontWeight: font.weight_4,
    textAlign: "start",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  icon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: controlSize._4,
    color: color.fgMuted,
  },
  row: {
    marginBlockStart: {
      default: 0,
      ":is(:has(ul), :has(ul) + *):not(:first-child)": navListTokens.step,
    },
  },
});
