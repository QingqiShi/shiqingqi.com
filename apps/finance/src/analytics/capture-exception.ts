import { posthogClient } from "./posthog-client";

// An error thrown before initPostHog's import resolves is dropped — the same
// window in which posthog-js itself cannot capture anything pre-init.
export function captureException(error: unknown) {
  posthogClient.current?.captureException(error);
}
