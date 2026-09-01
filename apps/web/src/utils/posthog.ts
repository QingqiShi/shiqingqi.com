import type { BeforeSendFn, PostHog } from "posthog-js";
import type { SupportedLocale } from "#src/types.ts";

// Both values are inlined by Next at build time, so they must be read as whole
// `process.env.X` expressions. Without them `initPostHog` never runs and every
// helper below is a no-op.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const posthogEnabled = Boolean(token && host);

// The browser hides an uncaught error thrown by another origin's script behind
// a synthetic "Script error." with no stack, so it names no code in this app.
const opaqueCrossOriginMessage = "Script error.";

function isOpaqueCrossOriginError(exception: unknown) {
  if (typeof exception !== "object" || exception === null) return false;
  if (
    !("value" in exception) ||
    exception.value !== opaqueCrossOriginMessage ||
    !("mechanism" in exception)
  ) {
    return false;
  }
  const { mechanism } = exception;
  return (
    typeof mechanism === "object" &&
    mechanism !== null &&
    "synthetic" in mechanism &&
    mechanism.synthetic === true
  );
}

function isOpaqueCrossOriginExceptionList(exceptions: unknown) {
  return (
    Array.isArray(exceptions) &&
    exceptions.length > 0 &&
    exceptions.every(isOpaqueCrossOriginError)
  );
}

export const dropOpaqueCrossOriginErrors: BeforeSendFn = (event) => {
  if (!event || event.event !== "$exception") return event;
  return isOpaqueCrossOriginExceptionList(event.properties.$exception_list)
    ? null
    : event;
};

// React's <ViewTransition> drives the browser view transition API. When an
// update lands mid-transition, the browser skips the old transition and
// rejects its promise with this AbortError. Nothing awaits that promise, so
// the unhandled rejection is benign: only the animation is skipped.
const skippedTransitionMessage = "AbortError: Transition was skipped";

function isSkippedTransitionError(exception: unknown) {
  if (typeof exception !== "object" || exception === null) return false;
  return (
    "type" in exception &&
    exception.type === "DOMException" &&
    "value" in exception &&
    exception.value === skippedTransitionMessage
  );
}

function isSkippedTransitionExceptionList(exceptions: unknown) {
  return (
    Array.isArray(exceptions) &&
    exceptions.length > 0 &&
    exceptions.every(isSkippedTransitionError)
  );
}

export const dropSkippedTransitionErrors: BeforeSendFn = (event) => {
  if (!event || event.event !== "$exception") return event;
  return isSkippedTransitionExceptionList(event.properties.$exception_list)
    ? null
    : event;
};

let initialised = false;
let client: PostHog | undefined;

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
  if (!posthogEnabled || initialised || !token || !host) return;
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
    before_send: [dropOpaqueCrossOriginErrors, dropSkippedTransitionErrors],
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

// The one place that declares a custom event. Every name and property shape
// lives here, so no call site can invent or reshape an event.
type AnalyticsEvents = {
  "conversation started": { locale: SupportedLocale };
  "message sent": {
    locale: SupportedLocale;
    started_conversation: boolean;
    conversation_message_count: number;
  };
};

/** One declared event with the properties its name asks for. */
export type AnalyticsEvent = {
  [Name in keyof AnalyticsEvents]: {
    name: Name;
    properties: AnalyticsEvents[Name];
  };
}[keyof AnalyticsEvents];

// Product events for the same pre-init window are dropped as well, and every
// build without the env vars sends nothing at all.
export function captureEvent<Name extends keyof AnalyticsEvents>(
  event: Name,
  properties: AnalyticsEvents[Name],
) {
  client?.capture(event, properties);
}
