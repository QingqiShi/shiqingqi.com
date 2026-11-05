import { describe, expect, it } from "vitest";
import { createAuthTestClient } from "./testing/create-auth-test-client.ts";
import {
  makeHandlers,
  now,
  setUpAuthHandlerTests,
} from "./testing/test-auth-handlers.ts";

setUpAuthHandlerTests();

describe("request guards", () => {
  it("rejects a cross-origin or origin-less POST", async () => {
    const client = createAuthTestClient(makeHandlers());

    const crossOrigin = await client.post(
      "signInOptions",
      {},
      "https://evil.example",
    );
    const noOrigin = await client.post("signInOptions", {}, null);

    expect(crossOrigin).toMatchObject({
      status: 403,
      body: { error: "forbidden_origin" },
    });
    expect(noOrigin.status).toBe(403);
  });

  it("rejects a request over the rate limit", async () => {
    const client = createAuthTestClient(
      makeHandlers({
        limitRequest: () =>
          Promise.resolve({ success: false, reset: now.getTime() + 1000 }),
      }),
    );

    const result = await client.post("signInOptions");

    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("1");
  });
});
