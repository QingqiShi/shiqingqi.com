import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_CREATURE } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import type { LoreOutput } from "#src/pixel-creature-creator/lore/lore-output-schema.ts";
import { limitLoreRequest } from "./limit-lore-request";
import { makeLoreHandler, type LoreHandlerDeps } from "./route";

function loreRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(
    "http://localhost:3000/api/pixel-creature-creator/lore",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    },
  );
}

const validLore: LoreOutput = {
  nameSuggestion: "Sproutling",
  loreEn: "A gentle sprout that hums when the sun rises.",
  loreZh: "黎明时分会哼歌的小芽。",
  type: "leaf",
};

function withDeps(deps: Partial<LoreHandlerDeps> = {}): LoreHandlerDeps {
  const baseLimit: LoreHandlerDeps["limitRequest"] = () =>
    Promise.resolve({ success: true, reset: Date.now() + 60_000 });
  const baseGenerate: LoreHandlerDeps["generateLore"] = () =>
    Promise.resolve(validLore);
  return {
    limitRequest: deps.limitRequest ?? baseLimit,
    generateLore: deps.generateLore ?? baseGenerate,
  };
}

describe("POST /api/pixel-creature-creator/lore", () => {
  it("returns 200 with parsed lore on the happy path", async () => {
    const POST = makeLoreHandler(withDeps());
    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "en" }),
    );

    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(json).toEqual(validLore);
  });

  it("returns 400 when def has an invalid shape", async () => {
    const POST = makeLoreHandler(withDeps());
    const response = await POST(
      loreRequest({
        def: { ...DEFAULT_CREATURE, species: "not-a-real-species" },
        locale: "en",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const POST = makeLoreHandler(withDeps());
    const request = new NextRequest(
      "http://localhost:3000/api/pixel-creature-creator/lore",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{{{",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 429 with Retry-After when the limiter denies the request", async () => {
    const reset = Date.now() + 30_000;
    const POST = makeLoreHandler(
      withDeps({
        limitRequest: () => Promise.resolve({ success: false, reset }),
      }),
    );

    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "en" }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).not.toBeNull();
  });

  it("returns 502 with lore_format when the AI SDK wraps a ZodError as the cause", async () => {
    // The AI SDK's `Output.object` wraps schema-validation failures inside its
    // own error class with the original ZodError stashed at `error.cause`.
    const parseResult = z.object({ loreZh: z.string() }).safeParse({});
    if (parseResult.success) {
      throw new Error("expected ZodError fixture to fail parsing");
    }
    const wrapped = new Error("No object generated", {
      cause: parseResult.error,
    });
    const POST = makeLoreHandler(
      withDeps({
        generateLore: () => Promise.reject(wrapped),
      }),
    );

    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "en" }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "lore_format" });
  });

  it.skipIf(!process.env.UPSTASH_REDIS_REST_URL)(
    "rate-limits the 11th request within a 60 s window against real Upstash",
    async () => {
      const POST = makeLoreHandler(
        withDeps({
          limitRequest: limitLoreRequest,
        }),
      );

      // Pin a unique IP so previous test runs don't contaminate this bucket.
      const ip = `it-${String(Date.now())}`;
      const headers = { "x-forwarded-for": ip };

      const responses = await Promise.all(
        Array.from({ length: 11 }, () =>
          POST(loreRequest({ def: DEFAULT_CREATURE, locale: "en" }, headers)),
        ),
      );

      const statuses = responses.map((r) => r.status);
      expect(statuses.filter((s) => s === 200)).toHaveLength(10);
      expect(statuses.filter((s) => s === 429)).toHaveLength(1);
    },
  );
});
