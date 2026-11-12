import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import type { BuddyKv } from "../store/types.ts";

export const CONNECT_TTL_SECONDS = 10 * 60;
export const POLL_INTERVAL_SECONDS = 5;

// RFC 8628 suggests letters that a person cannot read as another letter or
// a digit.
const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
const CODE_LENGTH = 8;
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const connectRequestSchema = z.object({
  code: z.string(),
  publicKey: z.string(),
  name: z.string(),
  status: z.enum(["pending", "approved", "denied"]),
  user: z.string().optional(),
  machineId: z.string().optional(),
});

type ConnectRequest = z.infer<typeof connectRequestSchema>;

const requestKey = (requestId: string) => `buddy:connect:${requestId}`;
const codeKey = (code: string) => `buddy:connect-code:${code}`;
const decisionKey = (requestId: string) => `buddy:connect-decided:${requestId}`;

function newCode() {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeCode(input: string): string | null {
  const letters = input.toUpperCase().replace(/[\s-]/g, "");
  if (letters.length !== CODE_LENGTH) return null;
  for (const letter of letters) {
    if (!CODE_ALPHABET.includes(letter)) return null;
  }
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

async function create(
  kv: BuddyKv,
  input: { publicKey: string; name: string },
): Promise<{ requestId: string; code: string }> {
  const requestId = randomBytes(32).toString("base64url");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const claimed = await kv.set(codeKey(code), requestId, {
      ttlSeconds: CONNECT_TTL_SECONDS,
      onlyIfAbsent: true,
    });
    if (!claimed) continue;
    const request: ConnectRequest = { ...input, code, status: "pending" };
    await kv.set(requestKey(requestId), JSON.stringify(request), {
      ttlSeconds: CONNECT_TTL_SECONDS,
    });
    return { requestId, code };
  }
  throw new Error("No free connect code after 5 tries.");
}

async function read(
  kv: BuddyKv,
  requestId: string,
): Promise<ConnectRequest | null> {
  const value = await kv.get(requestKey(requestId));
  return value === null ? null : connectRequestSchema.parse(JSON.parse(value));
}

async function findByCode(kv: BuddyKv, code: string) {
  const requestId = await kv.get(codeKey(code));
  if (requestId === null) return null;
  const request = await read(kv, requestId);
  return request?.code === code ? { requestId, request } : null;
}

function claimDecision(kv: BuddyKv, requestId: string) {
  return kv.set(decisionKey(requestId), "1", {
    ttlSeconds: CONNECT_TTL_SECONDS,
    onlyIfAbsent: true,
  });
}

function releaseDecision(kv: BuddyKv, requestId: string) {
  return kv.del(decisionKey(requestId));
}

async function saveDecision(
  kv: BuddyKv,
  requestId: string,
  request: ConnectRequest,
) {
  await kv.set(requestKey(requestId), JSON.stringify(request), {
    ttlSeconds: CONNECT_TTL_SECONDS,
  });
  await kv.del(codeKey(request.code));
}

export const connectRequestStore = {
  create,
  read,
  findByCode,
  claimDecision,
  releaseDecision,
  saveDecision,
};
