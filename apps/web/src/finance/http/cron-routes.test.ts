import { readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CRON_FOLDER = path.join(
  import.meta.dirname,
  "../../app/api/finance/cron",
);
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routeFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

function isHandler(value: unknown): value is (request: Request) => unknown {
  return typeof value === "function";
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cron routes", () => {
  const files = routeFiles(CRON_FOLDER);

  it("finds the cron routes", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  // The proxy lets every request under /api/finance/cron/ through without a
  // Referer, so each handler must refuse a request without the secret.
  it.each(files.map((file) => path.relative(CRON_FOLDER, file)))(
    "%s refuses a request without the cron secret",
    async (file) => {
      const route: unknown = await import(path.join(CRON_FOLDER, file));
      const handlers = METHODS.flatMap((method) => {
        const handler: unknown =
          typeof route === "object" && route !== null
            ? Reflect.get(route, method)
            : undefined;
        return isHandler(handler) ? [handler] : [];
      });
      expect(handlers.length).toBeGreaterThan(0);
      for (const handler of handlers) {
        for (const authorization of [undefined, "Bearer wrong-secret"]) {
          const response = await handler(
            new Request("https://qingqi.dev/api/finance/cron/test", {
              headers: authorization ? { Authorization: authorization } : {},
            }),
          );
          expect(response).toBeInstanceOf(Response);
          expect(response instanceof Response && response.status).toBe(401);
        }
      }
    },
  );
});
