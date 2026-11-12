import { getRequestOrigin } from "@tuja/server-auth/get-request-origin";
import { isSameOrigin } from "@tuja/server-auth/is-same-origin";
import { z } from "zod";
import { readSession } from "../auth/read-session.ts";
import type { BuddyDb } from "../db/types.ts";
import { slowDown, withinRateLimit } from "../http/within-rate-limit.ts";
import { accountNameOf } from "../machines/account-name-of.ts";
import { machineStore } from "../machines/machine-store.ts";
import type { MachineRegistry } from "../machines/make-machine-registry.ts";
import type { BuddyKv } from "../store/types.ts";
import { publicKeyFromRaw } from "../upload/verify-upload-signature.ts";
import {
  CONNECT_TTL_SECONDS,
  connectRequestStore,
  normalizeCode,
  POLL_INTERVAL_SECONDS,
  REQUEST_ID_PATTERN,
} from "./connect-request-store.ts";

interface ConnectHandlerDeps {
  kv: BuddyKv;
  getDb: () => BuddyDb | null;
  registry: Pick<MachineRegistry, "connect">;
  now: () => Date;
  clientIp: (request: Request) => string;
}

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200, setCookie?: string | null) {
  const headers = new Headers(NO_STORE);
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return Response.json(body, { status, headers });
}

function isPublicKey(value: string) {
  try {
    publicKeyFromRaw(value);
    return true;
  } catch {
    return false;
  }
}

const startBody = z.strictObject({
  publicKey: z.base64().refine(isPublicKey),
  name: z
    .string()
    .trim()
    .min(1)
    .max(64)
    // Control characters could hide part of the name on the page.
    .refine((name) => !/\p{Cc}/u.test(name)),
});

const decideBody = z.strictObject({
  code: z.string().max(32),
  decision: z.enum(["approve", "deny"]),
});

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function makeConnectHandlers(deps: ConnectHandlerDeps) {
  return {
    async start(request: Request): Promise<Response> {
      if (
        !(await withinRateLimit(
          deps.kv,
          `connect-start:${deps.clientIp(request)}`,
          { limit: 10, windowSeconds: CONNECT_TTL_SECONDS },
        ))
      ) {
        return slowDown(CONNECT_TTL_SECONDS);
      }
      const body = startBody.safeParse(await readJson(request));
      if (!body.success) return json({ error: "invalid_body" }, 400);
      const { requestId, code } = await connectRequestStore.create(
        deps.kv,
        body.data,
      );
      const url = new URL("/connect", getRequestOrigin(request));
      url.searchParams.set("code", code);
      return json({
        requestId,
        code,
        url: url.toString(),
        expiresIn: CONNECT_TTL_SECONDS,
        interval: POLL_INTERVAL_SECONDS,
      });
    },

    async poll(request: Request, requestId: string): Promise<Response> {
      if (!REQUEST_ID_PATTERN.test(requestId)) {
        return json({ error: "invalid_request" }, 400);
      }
      const allowed =
        (await withinRateLimit(deps.kv, `connect-poll:${requestId}`, {
          limit: 20,
          windowSeconds: 60,
        })) &&
        (await withinRateLimit(
          deps.kv,
          `connect-poll-ip:${deps.clientIp(request)}`,
          { limit: 120, windowSeconds: 60 },
        ));
      if (!allowed) return slowDown(POLL_INTERVAL_SECONDS * 2);
      const stored = await connectRequestStore.read(deps.kv, requestId);
      if (!stored) return json({ status: "expired" });
      if (stored.status === "approved") {
        return json({
          status: "approved",
          user: stored.user,
          machine: { id: stored.machineId, name: stored.name },
        });
      }
      return json({ status: stored.status });
    },

    async decide(request: Request): Promise<Response> {
      if (!isSameOrigin(request))
        return json({ error: "forbidden_origin" }, 403);
      const db = deps.getDb();
      if (!db) return json({ error: "not_configured" }, 503);
      const signedIn = await readSession(db, request, deps.now());
      if (!signedIn) return json({ error: "unauthorized" }, 401);
      const reply = (body: unknown, status = 200) =>
        json(body, status, signedIn.setCookie);

      const body = decideBody.safeParse(await readJson(request));
      if (!body.success) return reply({ error: "invalid_body" }, 400);
      const code = normalizeCode(body.data.code);
      const found = code
        ? await connectRequestStore.findByCode(deps.kv, code)
        : null;
      if (!found) return reply({ error: "not_found" }, 404);
      const { requestId, request: pending } = found;
      const { userId } = signedIn.session;
      const name = await accountNameOf(db, userId);
      if (!name) return reply({ error: "unauthorized" }, 401);
      if (
        pending.status !== "pending" ||
        !(await connectRequestStore.claimDecision(deps.kv, requestId))
      ) {
        return reply({ error: "already_decided" }, 409);
      }

      try {
        if (body.data.decision === "deny") {
          await connectRequestStore.saveDecision(deps.kv, requestId, {
            ...pending,
            status: "denied",
          });
          return reply({ ok: true });
        }
        const machine = await machineStore.connect(db, {
          userId,
          publicKey: pending.publicKey,
          name: pending.name,
          now: deps.now(),
        });
        await deps.registry.connect({
          machineId: machine.machineId,
          userId,
          name,
          publicKey: pending.publicKey,
        });
        await connectRequestStore.saveDecision(deps.kv, requestId, {
          ...pending,
          status: "approved",
          user: name,
          machineId: machine.machineId,
        });
        return reply({
          ok: true,
          machine: { id: machine.machineId, name: machine.name },
        });
      } catch (error) {
        // Let the owner try again: a retry connects the same key to the
        // same machine.
        await connectRequestStore.releaseDecision(deps.kv, requestId);
        throw error;
      }
    },
  };
}
