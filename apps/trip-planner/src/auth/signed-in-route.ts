import { isSameOrigin } from "@tuja/server-auth/is-same-origin";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import "server-only";
import type { z } from "zod";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { resolveSession } from "./resolve-session.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";

/** A JSON answer that no cache keeps. */
export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** The user id of a signed-in request that a page of this app sent, or the refusal. */
async function requireUserId(request: Request): Promise<string | Response> {
  if (!isSameOrigin(request)) return json({ error: "forbidden" }, 403);
  const token = readRequestCookie(request, tripsSessionCookie.name);
  const resolved = token
    ? await resolveSession(getTripsDb(), token, {
        now: new Date(),
        allowRefresh: false,
      })
    : null;
  return resolved?.session.userId ?? json({ error: "unauthorized" }, 401);
}

/** A route for a signed-in user: `run` gets the user id, the body that `schema` read, and the request. */
export function signedInRoute<T>(
  schema: z.ZodType<T>,
  run: (userId: string, body: T, request: Request) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    const userId = await requireUserId(request);
    if (typeof userId !== "string") return userId;
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) return json({ error: "invalid_body" }, 400);
    return run(userId, body.data, request);
  };
}
