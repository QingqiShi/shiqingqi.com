import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { redactEventTokens } from "./redact-event-tokens";

const token = "q3J0Zk1xV2t0bE9fYlR5c0pXeGh2Q0VyM2lNRFZ3b0s";
const pageUrl = `https://finance.qingqi.dev/zh/invite/${token}`;

describe("redactEventTokens", () => {
  it("removes the token from every string and key of an event", () => {
    const event = {
      uuid: "01994f9c-0000-7000-8000-000000000000",
      event: "$$heatmap",
      properties: {
        $current_url: `${pageUrl}?next=%2Frecover%2F${token}`,
        $pathname: `/zh/invite/${token}`,
        $heatmap_data: { [pageUrl]: [{ x: 1, y: 2 }] },
        $elements_chain: `a:href="/sign-in?next=%2Finvite%2F${token}"`,
      },
      $set_once: { $initial_current_url: pageUrl },
    } satisfies CaptureResult;

    const redacted = redactEventTokens(event);

    expect(JSON.stringify(redacted)).not.toContain(token);
    expect(redacted?.properties.$current_url).toBe(
      "https://finance.qingqi.dev/zh/invite/[token]?next=%2Frecover%2F[token]",
    );
  });

  it("keeps the project key and the session id, which PostHog needs", () => {
    const event = {
      uuid: "01994f9c-0000-7000-8000-000000000000",
      event: "$pageview",
      properties: {
        token: "phc_0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4c",
        $session_id: "01994f9c-0000-7000-8000-000000000001",
      },
    } satisfies CaptureResult;

    expect(redactEventTokens(event)).toEqual(event);
  });
});
