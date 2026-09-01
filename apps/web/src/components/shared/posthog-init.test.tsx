import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import { posthogEnabled } from "#src/utils/posthog/posthog-enabled.ts";
import { PostHogInit } from "./posthog-init";

describe("PostHogInit", () => {
  // NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST are unset
  // under vitest (see vitest.config.mts — no dotenv loading), so PostHog stays
  // disabled here. The real initialisation path runs through posthog-init's
  // e2e coverage instead, with placeholder env vars (playwright.config.ts).
  it("stays disabled without the PostHog env vars", () => {
    expect(posthogEnabled).toBe(false);
  });

  it("renders nothing and does not throw", () => {
    const { container } = render(<PostHogInit />);
    expect(container).toBeEmptyDOMElement();
  });
});
