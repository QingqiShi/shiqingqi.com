"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { redactTokens } from "./redact-tokens";

function withRedactedUrl<Event extends { url: string }>(event: Event): Event {
  return { ...event, url: redactTokens(event.url) };
}

/** Vercel Web Analytics and Speed Insights, which never send a token URL. */
export function VercelObservability() {
  return (
    <>
      <Analytics beforeSend={withRedactedUrl} />
      <SpeedInsights beforeSend={withRedactedUrl} />
    </>
  );
}
