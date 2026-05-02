import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAnthropicModel } from "#src/ai-chat/client.ts";
import { generateCreatureLore } from "#src/components/pixel-creature-creator/lore/generate-creature-lore.ts";
import type { LoreOutput } from "#src/components/pixel-creature-creator/lore/lore-schema.ts";
import {
  creatureDefSchema,
  type CreatureDef,
} from "#src/components/pixel-creature-creator/state/creature-schema.ts";
import type { SupportedLocale } from "#src/types.ts";
import {
  limitLoreRequest,
  resolveClientIp,
  type LoreRateLimitResult,
} from "./rate-limiter";

const requestSchema = z.object({
  def: creatureDefSchema,
  locale: z.enum(["en", "zh"]).default("en"),
});

interface ErrorBody {
  error: string;
  retryAfter?: number;
}

function jsonError(body: ErrorBody, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

/**
 * Dependency-injection seam for the POST handler. Production wires real
 * implementations; tests pass deterministic fakes so the route can be
 * exercised end-to-end without `vi.mock`. Keeping the surface narrow
 * (a single limiter call + a single lore generator) lets the handler stay
 * focused on validation, status codes, and error mapping.
 */
export interface LoreHandlerDeps {
  limitRequest: (identifier: string) => Promise<LoreRateLimitResult>;
  generateLore: (input: {
    def: CreatureDef;
    locale: SupportedLocale;
  }) => Promise<LoreOutput>;
}

export function makeLoreHandler(deps: LoreHandlerDeps) {
  return async function POST(request: NextRequest) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError({ error: "invalid_body" }, 400);
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError({ error: "invalid_body" }, 400);
    }

    const ip = resolveClientIp(request.headers);
    let limitOutcome: LoreRateLimitResult;
    try {
      limitOutcome = await deps.limitRequest(ip);
    } catch (error) {
      console.error("PCC lore rate-limit error:", error);
      // Fail closed on Redis errors — better to surface a 502 than silently
      // serve unlimited traffic past a broken limiter.
      return jsonError({ error: "lore_unavailable" }, 502);
    }

    if (!limitOutcome.success) {
      const retryAfter = Math.max(
        0,
        Math.ceil((limitOutcome.reset - Date.now()) / 1000),
      );
      return jsonError({ error: "rate_limited", retryAfter }, 429, {
        "Retry-After": String(retryAfter),
      });
    }

    try {
      const lore = await deps.generateLore({
        def: parsed.data.def,
        locale: parsed.data.locale,
      });
      return Response.json(lore, { status: 200 });
    } catch (error) {
      // Distinguish schema regressions (the model returned data that doesn't
      // match `loreOutputSchema`) from upstream/provider failures so we can
      // alert on them separately. Both still surface as 502 to the client,
      // but the error code lets monitoring split the two.
      //
      // The AI SDK wraps schema-validation failures inside its own error
      // classes (e.g. `NoObjectGeneratedError`) and stashes the original
      // `ZodError` in `error.cause`. We accept either the raw form (tests
      // injecting a ZodError directly) or the SDK-wrapped form so the same
      // branch fires in production and in test.
      const zodCause =
        error instanceof z.ZodError
          ? error
          : error instanceof Error && error.cause instanceof z.ZodError
            ? error.cause
            : null;
      if (zodCause !== null) {
        console.warn("[pcc-lore] schema mismatch", zodCause.issues);
        return jsonError({ error: "lore_format" }, 502);
      }
      console.warn(
        "[pcc-lore] provider error",
        error instanceof Error ? error.message : error,
      );
      return jsonError({ error: "lore_unavailable" }, 502);
    }
  };
}

export const POST = makeLoreHandler({
  limitRequest: limitLoreRequest,
  generateLore: (input) => generateCreatureLore(getAnthropicModel(), input),
});
