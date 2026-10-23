import * as stylex from "@stylexjs/stylex";
import { createContext, type ComponentProps, type ComponentType } from "react";
import { space } from "../tokens.stylex.ts";

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
  /** Whether the group that holds the rows shows a label above them. */
  labelled: boolean;
  linkComponent: ComponentType<NavListLinkProps>;
}

/** @internal */
export const NavListContext = createContext<NavListContextValue>({
  nested: false,
  labelled: false,
  linkComponent: PlainAnchor,
});

/** @internal */
export const navListStyles = stylex.create({
  rowInset: {
    paddingInline: space._3,
  },
});
