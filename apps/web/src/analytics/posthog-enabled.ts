import { POSTHOG_HOST, POSTHOG_TOKEN } from "./constants";

export const posthogEnabled = Boolean(POSTHOG_TOKEN && POSTHOG_HOST);
