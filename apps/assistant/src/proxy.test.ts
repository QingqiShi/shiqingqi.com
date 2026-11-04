import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy.ts";

async function statusOf(path: string, referer?: string) {
  const request = new NextRequest(`https://assistant.qingqi.dev${path}`, {
    method: "POST",
    headers: referer ? { Referer: referer } : {},
  });
  return (await proxy(request)).status;
}

describe("the proxy, for a request without a Referer", () => {
  it("lets the capture route through", async () => {
    expect(await statusOf("/api/todos/capture")).toBe(200);
  });

  it.each([
    "/api/todos",
    "/api/todos/capture/extra",
    "/api/todos/capture-tokens",
    "/api/todos/bulk",
    "/api/settings/capture-tokens",
  ])("refuses %s", async (path) => {
    expect(await statusOf(path)).toBe(403);
  });
});
