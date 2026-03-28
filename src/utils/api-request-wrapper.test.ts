import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { apiRequestWrapper } from "./api-request-wrapper";

type TestServerFn = (params: {
  page?: number;
  enabled?: boolean;
  name?: string;
  tags?: string[];
}) => Promise<{ ok: boolean }>;

function captureSearchParams(
  path: string,
  handler: (params: URLSearchParams) => void,
) {
  server.use(
    http.get(`*${path}`, ({ request }) => {
      handler(new URL(request.url).searchParams);
      return HttpResponse.json({ ok: true });
    }),
  );
}

describe("apiRequestWrapper", () => {
  describe("parameter serialization", () => {
    it("includes numeric 0 in query params", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", { page: 0 });

      expect(captured?.get("page")).toBe("0");
    });

    it("includes boolean false in query params", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", { enabled: false });

      expect(captured?.get("enabled")).toBe("false");
    });

    it("includes empty string in query params", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", { name: "" });

      expect(captured?.get("name")).toBe("");
    });

    it("omits null values", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", {
        page: 1,
        name: null as unknown as string,
      });

      expect(captured?.get("page")).toBe("1");
      expect(captured?.has("name")).toBe(false);
    });

    it("omits undefined values", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", {
        page: 1,
        name: undefined,
      });

      expect(captured?.get("page")).toBe("1");
      expect(captured?.has("name")).toBe(false);
    });

    it("appends array values as repeated params", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", {
        tags: ["a", "b", "c"],
      });

      expect(captured?.getAll("tags")).toEqual(["a", "b", "c"]);
    });

    it("serializes string and number params correctly", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", {
        page: 3,
        name: "hello",
      });

      expect(captured?.get("page")).toBe("3");
      expect(captured?.get("name")).toBe("hello");
    });
  });

  describe("error handling", () => {
    it("throws on non-ok responses", async () => {
      server.use(
        http.get("*/api/test", () =>
          HttpResponse.json({ error: "Not found" }, { status: 404 }),
        ),
      );

      await expect(
        apiRequestWrapper<TestServerFn>("/api/test", {}),
      ).rejects.toThrow();
    });

    it("throws when called during SSR", async () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      try {
        await expect(
          apiRequestWrapper<TestServerFn>("/api/test", {}),
        ).rejects.toThrow("apiRequestWrapper called during SSR");
      } finally {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          writable: true,
          configurable: true,
        });
      }
    });
  });
});
