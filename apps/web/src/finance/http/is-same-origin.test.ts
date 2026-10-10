import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./is-same-origin.ts";

function post(origin?: string) {
  return new Request("https://qingqi.dev/api/finance/sync", {
    method: "POST",
    headers: origin === undefined ? {} : { Origin: origin },
  });
}

describe("isSameOrigin", () => {
  it("accepts the request's own origin", () => {
    expect(isSameOrigin(post("https://qingqi.dev"))).toBe(true);
  });

  it("uses the Host header the browser sent", () => {
    const request = new Request("http://localhost:3000/api/finance/sync", {
      method: "POST",
      headers: { Origin: "http://mac.local:3000", Host: "mac.local:3000" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it("refuses another origin or none", () => {
    expect(isSameOrigin(post("https://evil.example"))).toBe(false);
    expect(isSameOrigin(post("http://qingqi.dev"))).toBe(false);
    expect(isSameOrigin(post())).toBe(false);
  });
});
