import { useSearchParams } from "next/navigation";
import { useStateInUrl } from "../navigation/use-state-in-url.ts";
import { analyticsParams } from "./analytics-params.ts";
import type { AnalyticsState } from "./compute-analytics-view.ts";

/** The Analytics screen's state, read from the URL once and written back in place. */
export function useAnalyticsState() {
  const searchParams = useSearchParams();
  const [state, setState] = useStateInUrl(
    () => analyticsParams.parse(searchParams),
    (next) => ({ screen: "analytics", state: next }),
  );
  const update = (patch: Partial<AnalyticsState>) => {
    setState({ ...state, ...patch });
  };
  return [state, update] as const;
}
