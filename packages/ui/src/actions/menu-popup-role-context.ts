import { createContext } from "react";

/**
 * The role of the `MenuButton` popup that a `MenuItem` sits in, or `null`
 * outside one. A `MenuItem` takes `role="menuitem"` only inside a menu.
 *
 * @internal
 */
export const MenuPopupRoleContext = createContext<"menu" | "group" | null>(
  null,
);
