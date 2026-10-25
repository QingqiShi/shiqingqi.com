import { breakpoints } from "./breakpoints.stylex.ts";

/**
 * The bare media condition behind `breakpoints.md`, for `matchMedia`, which
 * takes no `@media ` prefix.
 *
 * @internal
 */
export const MD_QUERY = breakpoints.md.replace("@media ", "");
