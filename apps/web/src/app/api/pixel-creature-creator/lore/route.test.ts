import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { LoreOutput } from "#src/components/pixel-creature-creator/lore/lore-schema.ts";
import {
  DEFAULT_CREATURE,
  type CreatureDef,
} from "#src/components/pixel-creature-creator/state/creature-schema.ts";
import type { SupportedLocale } from "#src/types.ts";
import { limitLoreRequest } from "./rate-limiter";
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

/**
 * Default test deps: rate limit allows the request, lore generator returns
 * a known-valid payload. Individual tests override fields as needed via
 * `Object.assign` (no `as Partial<...>` casts required because the helper
 * takes a fully-typed `LoreHandlerDeps`).
 */
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

  it("defaults locale to en when omitted", async () => {
    const seenLocales: SupportedLocale[] = [];
    const POST = makeLoreHandler(
      withDeps({
        generateLore: (input) => {
          seenLocales.push(input.locale);
          return Promise.resolve(validLore);
        },
      }),
    );

    const response = await POST(loreRequest({ def: DEFAULT_CREATURE }));

    expect(response.status).toBe(200);
    expect(seenLocales).toEqual(["en"]);
  });

  it("threads the parsed creature def through to the generator", async () => {
    const seenDefs: CreatureDef[] = [];
    const POST = makeLoreHandler(
      withDeps({
        generateLore: (input) => {
          seenDefs.push(input.def);
          return Promise.resolve(validLore);
        },
      }),
    );

    await POST(loreRequest({ def: DEFAULT_CREATURE, locale: "zh" }));

    expect(seenDefs).toHaveLength(1);
    expect(seenDefs[0]).toEqual(DEFAULT_CREATURE);
  });

  it("returns 400 when the body is missing def", async () => {
    const POST = makeLoreHandler(withDeps());
    const response = await POST(loreRequest({ locale: "en" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
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
    expect(await response.json()).toEqual({ error: "invalid_body" });
  });

  it("returns 400 for an invalid locale", async () => {
    const POST = makeLoreHandler(withDeps());
    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "fr" }),
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

  it("returns 429 with retryAfter when the limiter denies the request", async () => {
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
    const body: unknown = await response.json();
    expect(body).toMatchObject({ error: "rate_limited" });
    expect(response.headers.get("Retry-After")).not.toBeNull();
  });

  it("returns 502 with lore_unavailable when generateLore throws a generic error", async () => {
    const POST = makeLoreHandler(
      withDeps({
        generateLore: () => Promise.reject(new Error("upstream")),
      }),
    );

    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "en" }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "lore_unavailable" });
  });

  it("returns 502 with lore_format when generateLore throws a ZodError", async () => {
    // Build a real ZodError instance so the route's `instanceof` check fires
    // exactly like it would in production when `loreOutputSchema.parse`
    // rejects model output.
    const schema = z.object({ loreZh: z.string() });
    const parseResult = schema.safeParse({});
    if (parseResult.success) {
      throw new Error("expected ZodError fixture to fail parsing");
    }
    const zodError = parseResult.error;
    const POST = makeLoreHandler(
      withDeps({
        generateLore: () => Promise.reject(zodError),
      }),
    );

    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "en" }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "lore_format" });
  });

  it("returns 502 with lore_format when the AI SDK wraps a ZodError as the cause", async () => {
    // The AI SDK's `Output.object` wraps schema-validation failures inside its
    // own error class with the original ZodError stashed at `error.cause`.
    // The route must recognise both forms.
    const schema = z.object({ loreZh: z.string() });
    const parseResult = schema.safeParse({});
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

  it("returns 502 when the limiter itself throws", async () => {
    const POST = makeLoreHandler(
      withDeps({
        limitRequest: () => Promise.reject(new Error("redis down")),
      }),
    );

    const response = await POST(
      loreRequest({ def: DEFAULT_CREATURE, locale: "en" }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "lore_unavailable" });
  });

  it.skipIf(!process.env.UPSTASH_REDIS_REST_URL)(
    "rate-limits the 11th request within a 60 s window against real Upstash",
    async () => {
      // Real-Redis path: wire the production limiter directly through the DI
      // seam. The lore generator stays stubbed because we're only verifying
      // the limiter, not the model.
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
      const okCount = statuses.filter((s) => s === 200).length;
      const rateLimited = statuses.filter((s) => s === 429).length;
      expect(okCount).toBe(10);
      expect(rateLimited).toBe(1);
    },
  );
});
