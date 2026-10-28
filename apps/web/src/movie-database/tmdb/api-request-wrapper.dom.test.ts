import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/testing/test-msw.ts";
import { apiRequestWrapper } from "./api-request-wrapper";

type TestServerFn = (params: {
  page?: number;
  enabled?: boolean;
  name?: string | null;
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

    it("omits null values", async () => {
      let captured: URLSearchParams | undefined;
      captureSearchParams("/api/test", (params) => {
        captured = params;
      });

      await apiRequestWrapper<TestServerFn>("/api/test", {
        page: 1,
        name: null,
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
  });
});
