import { isSameOrigin } from "@tuja/server-auth/is-same-origin";
import { z } from "zod";
import { MAX_CARE_PRESSES } from "#src/pet/max-care-presses.ts";
import { ACCOUNT_NAME_PATTERN } from "../account-name-pattern.ts";
import { readSession } from "../auth/read-session.ts";
import type { BuddyDb } from "../db/types.ts";
import { slowDown, withinRateLimit } from "../http/within-rate-limit.ts";
import { accountNameOf } from "../machines/account-name-of.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";

/** Requests that one IP may send for one page in a window. */
export const CARE_RATE_LIMIT = { limit: 30, windowSeconds: 10 * 60 };

const pressesSchema = z.int().min(0).max(MAX_CARE_PRESSES);
const careBody = z
  .strictObject({ fed: pressesSchema, patted: pressesSchema })
  .refine((body) => body.fed + body.patted > 0);

interface CareDeps {
  kv: BuddyKv;
  /** Null when the app has no database: then only a public page counts. */
  getDb: () => BuddyDb | null;
  now: () => Date;
  clientIp: (request: Request) => string;
}

const noStore = { "Cache-Control": "no-store" };

const notFound = () =>
  Response.json({ error: "not found" }, { status: 404, headers: noStore });

/**
 * The owner's session, when the request carries the session of the account
 * that `name` names, with the renewed cookie that the reply must send.
 */
async function ownerSession(deps: CareDeps, request: Request, name: string) {
  const db = deps.getDb();
  if (!db) return null;
  const signedIn = await readSession(db, request, deps.now());
  if (!signedIn) return null;
  return (await accountNameOf(db, signedIn.session.userId)) === name
    ? signedIn
    : null;
}

/**
 * `POST /api/v1/u/[user]/care`: a page's batch of waterings and pats. It
 * counts only where the caller may see the page, which is a public page, or
 * a private one with its owner's session; any other name answers as the read
 * API answers a name that no account has. Only a request with a session
 * cookie for a private page reads Postgres, and as it counts by the cookie,
 * it must come from this origin.
 */
export async function handleCare(
  request: Request,
  user: string,
  deps: CareDeps,
): Promise<Response> {
  if (!ACCOUNT_NAME_PATTERN.test(user)) return notFound();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = undefined;
  }
  const body = careBody.safeParse(raw);
  if (!body.success) {
    return Response.json(
      { error: "invalid body" },
      { status: 400, headers: noStore },
    );
  }
  const isPublic = (await deps.kv.get(buddyKeys.publicAccount(user))) !== null;
  let setCookie: string | null = null;
  if (!isPublic) {
    const owner = await ownerSession(deps, request, user);
    if (!owner) return notFound();
    if (!isSameOrigin(request)) {
      return Response.json(
        { error: "forbidden_origin" },
        { status: 403, headers: noStore },
      );
    }
    setCookie = owner.setCookie;
  }
  if (
    !(await withinRateLimit(
      deps.kv,
      `care:${user}:${deps.clientIp(request)}`,
      CARE_RATE_LIMIT,
    ))
  ) {
    return slowDown(CARE_RATE_LIMIT.windowSeconds);
  }
  await deps.kv.incrementBy([
    [buddyKeys.careFed(user), body.data.fed],
    [buddyKeys.carePatted(user), body.data.patted],
  ]);
  const headers = new Headers(noStore);
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return new Response(null, { status: 204, headers });
}
