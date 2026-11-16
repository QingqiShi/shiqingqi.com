import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { proxy as Proxy } from "./proxy";

// The gate reads the passwords when its module loads.
vi.stubEnv("SITE_PASSWORD_GB", "gb-password");
vi.stubEnv("SITE_PASSWORD_TUSCANY", "tuscany-password");

let proxy: typeof Proxy;
let gbCookie: string;
beforeAll(async () => {
  ({ proxy } = await import("./proxy"));
  const { gateToken } = await import("./trip-gate");
  gbCookie = `trip_gate=${await gateToken("trip", "gb-password")}`;
});

async function request(
  path: string,
  {
    cookie,
    headers,
  }: { cookie?: string; headers?: Record<string, string> } = {},
) {
  const req = new NextRequest(`https://trip.test${path}`, {
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  });
  return proxy(req);
}

function location(response: Response) {
  const value = response.headers.get("location");
  return value === null ? null : new URL(value).pathname;
}

describe("trip gate", () => {
  it.each([
    ["/gb", "/unlock/gb"],
    ["/gb/", "/unlock/gb"],
    ["/en/gb", "/unlock/gb"],
    ["/en/gb/", "/unlock/gb"],
    ["/zh/gb", "/zh/unlock/gb"],
    ["/zh/gb/", "/zh/unlock/gb"],
    ["/%67b", "/unlock/gb"],
    ["/zh/%67%62", "/zh/unlock/gb"],
    ["/%7Ah/gb", "/zh/unlock/gb"],
    ["//gb", "/unlock/gb"],
    ["/zh//gb", "/zh/unlock/gb"],
  ])("sends %s to %s without the cookie", async (path, unlock) => {
    const response = await request(path);
    expect(response.status).toBe(307);
    expect(location(response)).toBe(unlock);
  });

  it("locks the RSC and prefetch requests of a trip too", async () => {
    const response = await request("/zh/gb?_rsc=abc", {
      headers: {
        RSC: "1",
        "Next-Router-Prefetch": "1",
        "Sec-Fetch-Dest": "empty",
      },
    });
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/zh/unlock/gb");
  });

  it.each(["/gb", "/gb/", "/en/gb", "/en/gb/", "/zh/gb", "/zh/gb/", "/%67b"])(
    "lets %s through with the cookie",
    async (path) => {
      const response = await request(path, { cookie: gbCookie });
      expect(location(response) ?? "").not.toContain("/unlock/");
      expect(response.status).not.toBe(503);
    },
  );

  it("does not let one trip's cookie unlock another trip", async () => {
    const response = await request("/zh/tuscany", { cookie: gbCookie });
    expect(location(response)).toBe("/zh/unlock/tuscany");
  });

  it("rejects a path that does not decode", async () => {
    const response = await request("/%E0%A4%A");
    expect(response.status).toBe(400);
  });

  it("leaves the picker and the unlock form open", async () => {
    for (const path of ["/", "/zh", "/unlock/gb", "/zh/unlock/gb"]) {
      const response = await request(path);
      expect(location(response) ?? "").not.toContain("/unlock/");
    }
  });
});
