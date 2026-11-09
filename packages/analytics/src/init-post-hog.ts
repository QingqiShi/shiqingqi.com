import { POSTHOG_HOST, POSTHOG_TOKEN } from "./constants";
import { dropOpaqueCrossOriginErrors } from "./drop-opaque-cross-origin-errors";
import { dropSkippedTransitionErrors } from "./drop-skipped-transition-errors";
import { posthogClient } from "./posthog-client";
import { posthogEnabled } from "./posthog-enabled";

let initialised = false;

// Must run after hydration: posthog.init injects its remote-config script next
// to the first `body > script`, which here is the theme InlineScript in the
// root layout. Injecting before hydration makes React find an unexpected node
// there and re-hydrate the whole root on every page load. An earlier
// `body > script`, or a moved or removed theme script, moves the injection
// point and can bring the bug back.
//
// posthog-js is imported dynamically so it stays out of every route's initial
// bundle (it reaches them all via the layout and the error boundaries) and is
// never fetched at all in builds without the env vars.
export async function initPostHog() {
  // The token/host checks only narrow types; posthogEnabled is the rule.
  if (!posthogEnabled || initialised || !POSTHOG_TOKEN || !POSTHOG_HOST) return;
  initialised = true;

  const { default: posthog } = await import("posthog-js");
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
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
    before_send: [dropOpaqueCrossOriginErrors, dropSkippedTransitionErrors],
    capture_performance: { web_vitals: true },
    debug: process.env.NODE_ENV === "development",
  });
  posthogClient.current = posthog;
}
