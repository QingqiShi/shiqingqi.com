import { pointer } from "./breakpoints.stylex.ts";

/**
 * The bare media condition behind `pointer.canHover`, for `matchMedia`,
 * which takes no `@media ` prefix. Derived from the StyleX const, so the
 * script side cannot drift from the style side.
 *
 * @internal
 */
export const CAN_HOVER_QUERY = pointer.canHover.replace("@media ", "");
