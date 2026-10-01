import { posthogClient } from "./posthog-client";
import type { AnalyticsEvents } from "./types";

// Product events sent before initPostHog's import resolves are dropped, and
// every build without the env vars sends nothing at all.
export function captureEvent<Name extends keyof AnalyticsEvents>(
  event: Name,
  properties: AnalyticsEvents[Name],
) {
  posthogClient.current?.capture(event, properties);
}
