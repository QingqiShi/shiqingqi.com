import type { PostHog } from "posthog-js";

// Both values are inlined by Next at build time, so they must be read as whole
// `process.env.X` expressions. Without them `initPostHog` never runs and every
// helper below is a no-op.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Vercel sets this to "production", "preview", or "development". Preview
// deployments must not report into the production project, so only production
// builds initialise PostHog. The value is unset in local builds and e2e, where
// playwright.config.ts supplies "production" to keep the init path exercised.
const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export const posthogEnabled = Boolean(token && host && isProduction);

let initialised = false;
let client: PostHog | undefined;

// Must run after hydration: posthog.init injects its remote-config script next
// to the first <script> in the document. Injecting before hydration makes React
// find an unexpected node there and re-hydrate the whole root on every page
// load.
//
// posthog-js is imported dynamically so it stays out of every route's initial
// bundle (it reaches them all via the layout and the error boundaries) and is
// never fetched at all in builds without the env vars.
export async function initPostHog() {
  if (!token || !host || !isProduction || initialised) return;
  initialised = true;

  const { default: posthog } = await import("posthog-js");
  posthog.init(token, {
    api_host: host,
    // The host above is a reverse proxy, so links into PostHog need the real
    // dashboard URL. Without this the toolbar and its links go to the proxy.
    ui_host: "https://eu.posthog.com",
    // The app navigates on the client. The default captures the first page
    // view only, which hides every move between pages.
    capture_pageview: "history_change",
    // No cookies and no browser storage, so the site needs no consent banner.
    // PostHog counts visitors with a hash it computes server-side instead.
    // Needs "Cookieless server hash mode" enabled in the PostHog project.
    cookieless_mode: "always",
    capture_exceptions: true,
    capture_performance: { web_vitals: true },
    debug: process.env.NODE_ENV === "development",
  });
  client = posthog;
}

// An error thrown before initPostHog's import resolves is dropped — the same
// window in which posthog-js itself cannot capture anything pre-init.
export function captureException(error: unknown) {
  client?.captureException(error);
}
