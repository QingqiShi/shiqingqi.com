// Both values are inlined by Next at build time, so they must be read as whole
// `process.env.X` expressions. Without them `initPostHog` never runs and every
// helper beside it is a no-op.
export const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
