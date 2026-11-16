import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type * as ProxyModule from "./proxy";
import { gateToken } from "./trip-gate";

let proxy: typeof ProxyModule.proxy;

beforeAll(async () => {
  // `trip-gate` reads the passwords when it loads, so set them first.
  vi.stubEnv("SITE_PASSWORD_GB", "test-gb");
  vi.stubEnv("SITE_PASSWORD_TUSCANY", "test-tuscany");
  vi.resetModules();
  ({ proxy } = await import("./proxy"));
});

function request(
  path: string,
  { acceptLanguage, cookie }: { acceptLanguage: string; cookie?: string },
) {
  const headers = new Headers({ "Accept-Language": acceptLanguage });
  if (cookie) headers.set("Cookie", cookie);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

const tripPaths = ["/gb", "/en/gb", "/zh/gb", "/zh/gb/", "/%67b"];
const languages = ["en-GB,en;q=0.9", "zh-CN,zh;q=0.9"];

describe("trip password gate", () => {
  it.each(tripPaths.flatMap((path) => languages.map((lang) => [path, lang])))(
    "asks for the password at %s (%s)",
    async (path, acceptLanguage) => {
      const response = await proxy(request(path, { acceptLanguage }));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("Location") ?? "").pathname).toMatch(
        /^(?:\/zh)?\/unlock\/gb\/?$/,
      );
    },
  );

  it("keeps the language on the way to the unlock form", async () => {
    const zh = await proxy(
      request("/zh/gb", { acceptLanguage: "en-GB,en;q=0.9" }),
    );
    expect(new URL(zh.headers.get("Location") ?? "").pathname).toBe(
      "/zh/unlock/gb",
    );
  });

  it.each(["/gb", "/en/gb", "/zh/gb"])(
    "lets an unlocked visitor through at %s",
    async (path) => {
      const cookie = `trip_gate=${await gateToken("trip", "test-gb")}`;
      const response = await proxy(
        request(path, { acceptLanguage: "zh-CN,zh;q=0.9", cookie }),
      );

      expect(response.headers.get("Location") ?? "").not.toMatch(/unlock/);
    },
  );

  it("does not take one trip's unlock for another", async () => {
    const cookie = `trip_gate=${await gateToken("trip", "test-gb")}`;
    const response = await proxy(
      request("/zh/tuscany", { acceptLanguage: "zh-CN", cookie }),
    );

    expect(new URL(response.headers.get("Location") ?? "").pathname).toBe(
      "/zh/unlock/tuscany",
    );
  });
});
