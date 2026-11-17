import { isSameOrigin } from "@tuja/server-auth/is-same-origin";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import "server-only";
import { z } from "zod";
import { resolveSession } from "#src/auth/resolve-session.ts";
import { tripsSessionCookie } from "#src/auth/trips-session-cookie.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { tripSharing } from "./trip-sharing.ts";

function json(body: unknown, status = 200) {
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

/** A route for a signed-in user: `run` gets the user id and the body that `schema` read. */
function signedInRoute<T>(
  schema: z.ZodType<T>,
  run: (userId: string, body: T) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    const userId = await requireUserId(request);
    if (typeof userId !== "string") return userId;
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success) return json({ error: "invalid_body" }, 400);
    return run(userId, body.data);
  };
}

const createInvite = signedInRoute(
  z.object({ tripId: z.uuid() }),
  async (userId, { tripId }) => {
    const made = await tripSharing.createInvite(
      getTripsDb(),
      userId,
      tripId,
      new Date(),
    );
    if (made === "forbidden") return json({ error: "forbidden" }, 403);
    if (made === "full") return json({ error: "too_many_invites" }, 409);
    return json(
      {
        invite: {
          id: made.invite.id,
          expiresAt: made.invite.expiresAt.toISOString(),
        },
        path: `/invite/${made.token}`,
      },
      201,
    );
  },
);

const endInvite = signedInRoute(
  z.object({ inviteId: z.uuid() }),
  async (userId, { inviteId }) => {
    // An invite that is gone already gives the same answer: the owner wanted
    // it ended, and it is.
    await tripSharing.endInvite(getTripsDb(), userId, inviteId);
    return json({ ok: true });
  },
);

const acceptInvite = signedInRoute(
  z.object({ token: z.string() }),
  async (userId, { token }) => {
    const tripId = await tripSharing.acceptInvite(getTripsDb(), userId, token);
    // One answer for an invite that was used, ended, is past its time, or
    // never was.
    return tripId === null
      ? json({ error: "invite_invalid" }, 410)
      : json({ tripId });
  },
);

const removeMember = signedInRoute(
  z.object({ tripId: z.uuid(), userId: z.uuid() }),
  async (userId, { tripId, userId: memberId }) => {
    // A person who is no member already gives the same answer.
    await tripSharing.removeMember(getTripsDb(), userId, tripId, memberId);
    return json({ ok: true });
  },
);

export const sharingRoutes = {
  createInvite,
  endInvite,
  acceptInvite,
  removeMember,
};
