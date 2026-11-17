import "server-only";
import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { tripSharing } from "./trip-sharing.ts";

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
