import { isSameOrigin } from "@tuja/server-auth/is-same-origin";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { OwnerPetState, PublicPetState } from "#src/pet/types.ts";
import { readSession } from "../auth/read-session.ts";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { machineStore } from "../machines/machine-store.ts";
import type { MachineRegistry } from "../machines/make-machine-registry.ts";

export interface AccountHandlerDeps {
  getDb: () => BuddyDb | null;
  registry: Pick<MachineRegistry, "setVisibility">;
  /** The owner's view of their pet, also when the page is private. */
  readOwnPetState: (name: string) => Promise<PublicPetState | null>;
  /** Runs after the page of `name` changed visibility, so that no cache keeps the old answer. */
  onVisibilityChanged: (name: string) => void;
  now: () => Date;
}

const visibilityBody = z.strictObject({ public: z.boolean() });

function json(body: unknown, status = 200, setCookie?: string | null) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return Response.json(body, { status, headers });
}

async function readAccount(db: BuddyDb, userId: string) {
  const rows = await db
    .select({ name: accounts.name, isPublic: accounts.isPublic })
    .from(accounts)
    .where(eq(accounts.id, userId))
    .limit(1);
  return rows.at(0) ?? null;
}

/** The signed-in owner's routes for their own page. */
export function makeAccountHandlers(deps: AccountHandlerDeps) {
  return {
    async setVisibility(request: Request): Promise<Response> {
      if (!isSameOrigin(request)) {
        return json({ error: "forbidden_origin" }, 403);
      }
      const db = deps.getDb();
      if (!db) return json({ error: "not_configured" }, 503);
      const signedIn = await readSession(db, request, deps.now());
      if (!signedIn) return json({ error: "unauthorized" }, 401);
      const reply = (body: unknown, status = 200) =>
        json(body, status, signedIn.setCookie);

      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return reply({ error: "invalid_body" }, 400);
      }
      const body = visibilityBody.safeParse(raw);
      if (!body.success) return reply({ error: "invalid_body" }, 400);
      const { userId } = signedIn.session;
      let updated: { name: string; isPublic: boolean } | undefined;
      try {
        updated = await db.transaction(async (tx) => {
          const locked = (
            await tx
              .select({ name: accounts.name })
              .from(accounts)
              .where(eq(accounts.id, userId))
              .for("update")
          ).at(0);
          if (!locked) return undefined;
          const isPublic = body.data.public;
          await tx
            .update(accounts)
            .set({ isPublic })
            .where(eq(accounts.id, userId));
          await deps.registry.setVisibility({
            userId,
            name: locked.name,
            isPublic,
          });
          return { name: locked.name, isPublic };
        });
      } catch {
        return reply({ error: "visibility_failed" }, 503);
      }
      if (!updated) return reply({ error: "unauthorized" }, 401);
      deps.onVisibilityChanged(updated.name);
      return reply({ public: updated.isPublic });
    },

    /**
     * The owner page's refresh: the public read API has no answer for a
     * private page, and before the first upload the page needs to know
     * whether a Mac is connected yet.
     */
    async ownPetState(request: Request): Promise<Response> {
      const db = deps.getDb();
      if (!db) return json({ error: "not_configured" }, 503);
      const signedIn = await readSession(db, request, deps.now());
      if (!signedIn) return json({ error: "unauthorized" }, 401);
      const { userId } = signedIn.session;
      const account = await readAccount(db, userId);
      const [state, machines] = account
        ? await Promise.all([
            deps.readOwnPetState(account.name),
            machineStore.list(db, userId),
          ])
        : [null, []];
      if (!state) return json({ error: "not_found" }, 404, signedIn.setCookie);
      const body: OwnerPetState = { ...state, connectedMacs: machines.length };
      return json(body, 200, signedIn.setCookie);
    },
  };
}
