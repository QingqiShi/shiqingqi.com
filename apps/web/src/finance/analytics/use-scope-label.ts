import type { AnalyticsView } from "./compute-analytics-view.ts";
import { useAnalyticsNames } from "./use-analytics-names.ts";

/** The opened parent Category as "emoji name", or null at the top level. */
export function useScopeLabel(view: AnalyticsView): string | null {
  const names = useAnalyticsNames();
  const opened = view.path.at(-1);
  if (opened === undefined) return null;
  const { name, emoji } = names.category(opened);
  return emoji ? `${emoji} ${name}` : name;
}
