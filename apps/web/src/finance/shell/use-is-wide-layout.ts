import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { useMediaQuery } from "#src/browser/use-media-query.ts";

const LG_QUERY = breakpoints.lg.replace("@media ", "");

/** True at `lg` and wider, where a detail shows in a pane beside its list instead of in a sheet. */
export function useIsWideLayout() {
  return useMediaQuery(LG_QUERY, false);
}
