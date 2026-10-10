import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { serializeCookie } from "./serialize-cookie.ts";

const NAME = "finance_challenge";
const PATH = "/api/finance/auth";
const MAX_AGE_SECONDS = 5 * 60;

const challengePayloadSchema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("sign-in"), challenge: z.string() }),
  z.object({
    purpose: z.literal("setup"),
    challenge: z.string(),
    userId: z.uuid(),
    mode: z.enum(["create", "claim", "recover"]),
  }),
  z.object({
    purpose: z.literal("invite"),
    challenge: z.string(),
    userId: z.uuid(),
    inviteId: z.uuid(),
  }),
  z.object({
    purpose: z.literal("add-passkey"),
    challenge: z.string(),
    userId: z.uuid(),
  }),
]);

export type ChallengePayload = z.infer<typeof challengePayloadSchema>;

const signedSchema = z.object({
  payload: challengePayloadSchema,
  exp: z.number(),
});

function sign(body: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(body).digest();
}

export const financeChallengeCookie = {
  name: NAME,
  seal(payload: ChallengePayload, secret: string, now: Date): string {
    const body = Buffer.from(
      JSON.stringify({ payload, exp: now.getTime() + MAX_AGE_SECONDS * 1000 }),
    ).toString("base64url");
    return `${body}.${sign(body, secret).toString("base64url")}`;
  },
  open(value: string, secret: string, now: Date): ChallengePayload | null {
    const [body, signature, ...rest] = value.split(".");
    if (!body || !signature || rest.length > 0) return null;
    const expected = sign(body, secret);
    const actual = Buffer.from(signature, "base64url");
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }
    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    const parsed = signedSchema.safeParse(decoded);
    if (!parsed.success || parsed.data.exp <= now.getTime()) return null;
    return parsed.data.payload;
  },
  serialize(value: string, secure: boolean): string {
    return serializeCookie(NAME, value, {
      maxAgeSeconds: MAX_AGE_SECONDS,
      path: PATH,
      secure,
      sameSite: "Strict",
    });
  },
  clear(secure: boolean): string {
    return serializeCookie(NAME, "", {
      maxAgeSeconds: 0,
      path: PATH,
      secure,
      sameSite: "Strict",
    });
  },
};
