import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  type ComponentProps,
  type ComponentType,
} from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { normalizeUrl } from "../shells/normalize-url.ts";
import {
  border,
  controlHeight,
  controlSize,
  font,
  rhythm,
  space,
} from "../tokens.stylex.ts";
import type { NavListMotion } from "./create-nav-list-motion.ts";
import { navListQueries, navListTokens } from "./nav-list.stylex.ts";

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

interface NavViewValue {
  /**
   * The destination that the view around the list waits for. While it waits,
   * the link to it is current, and the others are not. It comes from the
   * router's pending state, never from a press, so a replaced navigation
   * cannot leave a link marked.
   */
  pendingHref: string | null;
  /** Whether the view shows the list as a page, which has no current row. */
  isPage: boolean;
}

/** @internal */
export const NavViewContext = createContext<NavViewValue>({
  pendingHref: null,
  isPage: false,
});

/**
 * Whether a row to `href` shows as current: `current`, until the view around it
 * says otherwise. A row with no `href` takes no action of the view.
 *
 * @internal
 */
export function useShownCurrent(href: string | undefined, current: boolean) {
  const { pendingHref, isPage } = use(NavViewContext);
  if (href === undefined) return current;
  if (isPage) return false;
  return pendingHref === null
    ? current
    : normalizeUrl(href) === normalizeUrl(pendingHref);
}

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
    minBlockSize: {
      default: controlHeight.sm,
      [pointer.coarse]: "44px",
      [navListQueries.sidebarPage]: space._8,
    },
    paddingBlock: space._0,
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
    borderBlockStartWidth: {
      default: 0,
      [navListQueries.sidebarPage]: {
        default: border.size_1,
        ":first-child": 0,
      },
    },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
});
