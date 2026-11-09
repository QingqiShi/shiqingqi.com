import type { PostHog } from "posthog-js";

/**
 * The one posthog-js client, filled in by `initPostHog`. It lives here rather
 * than beside `initPostHog` so a capture helper reads it without pulling the
 * dynamic `posthog-js` import into its own module graph.
 */
export const posthogClient: { current: PostHog | undefined } = {
  current: undefined,
};
