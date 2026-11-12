import { isSameOrigin } from "@tuja/server-auth/is-same-origin";
import { z } from "zod";
import { readSession } from "../auth/read-session.ts";
import type { BuddyDb } from "../db/types.ts";
import { accountNameOf } from "./account-name-of.ts";
import { machineStore } from "./machine-store.ts";
import type { MachineRegistry } from "./make-machine-registry.ts";

interface MachineHandlerDeps {
  getDb: () => BuddyDb | null;
  registry: Pick<MachineRegistry, "remove">;
  now: () => Date;
}

const removeBody = z.strictObject({ machineId: z.string().max(64) });

function json(body: unknown, status = 200, setCookie?: string | null) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return Response.json(body, { status, headers });
}

export function makeMachineHandlers(deps: MachineHandlerDeps) {
  return {
    async remove(request: Request): Promise<Response> {
      if (!isSameOrigin(request))
        return json({ error: "forbidden_origin" }, 403);
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
      const body = removeBody.safeParse(raw);
      if (!body.success) return reply({ error: "invalid_body" }, 400);
      const { userId } = signedIn.session;
      const { machineId } = body.data;
      const owned = await machineStore.revoke(db, {
        userId,
        machineId,
        now: deps.now(),
      });
      const name = owned ? await accountNameOf(db, userId) : null;
      if (name === null) return reply({ error: "not_found" }, 404);
      await deps.registry.remove({ machineId, name });
      return reply({ ok: true });
    },
  };
}
