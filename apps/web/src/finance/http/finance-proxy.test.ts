import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "#src/proxy.ts";

function documentRequest(path: string, session = false) {
  const headers = new Headers({
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
  });
  if (session) headers.set("Cookie", "finance_session=token");
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  vi.stubEnv("FINANCE_DATABASE_URL", "postgres://localhost/finance");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("finance proxy gate", () => {
  it("sends a visitor without a session to sign-in and keeps the page as next", () => {
    const response = proxy(documentRequest("/finance/transactions?id=abc"));
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/finance/sign-in?next=%2Ffinance%2Ftransactions%3Fid%3Dabc",
    );
  });

  it("keeps the Chinese locale on the way to sign-in", () => {
    const response = proxy(documentRequest("/zh/finance"));
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/zh/finance/sign-in",
    );
  });

  it("marks a signed-in page for the service worker", () => {
    const response = proxy(documentRequest("/finance", true));
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("x-finance-shell")).toBe("1");
  });

  it("hands the requested page to the layout, for a stale session's next", () => {
    const response = proxy(
      documentRequest("/zh/finance/analytics?range=12m", true),
    );
    expect(
      response.headers.get("x-middleware-override-headers")?.split(","),
    ).toContain("x-finance-path");
    expect(response.headers.get("x-middleware-request-x-finance-path")).toBe(
      "/finance/analytics?range=12m",
    );
  });

  it("leaves sign-in, invites, and other pages alone", () => {
    for (const path of ["/finance/sign-in", "/finance/invite/abc", "/"]) {
      const response = proxy(documentRequest(path));
      expect(response.headers.get("x-finance-shell")).toBeNull();
      expect(response.headers.get("Location") ?? "").not.toContain("sign-in");
    }
  });

  it("lets a deployment without a database render its own screen", () => {
    vi.stubEnv("FINANCE_DATABASE_URL", "");
    const response = proxy(documentRequest("/finance"));
    expect(response.headers.get("Location")).toBeNull();
  });
});
