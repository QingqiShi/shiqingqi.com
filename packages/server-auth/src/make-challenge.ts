import type { z } from "zod";
import { HttpError } from "./http-error.ts";
import { readRequestCookie } from "./read-request-cookie.ts";

interface ChallengeContext {
  secret: string;
  secure: boolean;
  now: Date;
  setCookies: string[];
}

export interface ChallengeCookie<Payload> {
  name: string;
  seal(payload: Payload, secret: string, now: Date): string;
  open(value: string, secret: string, now: Date): unknown;
  serialize(value: string, secure: boolean): string;
  clear(secure: boolean): string;
}

/**
 * The WebAuthn challenge of a ceremony, kept in a sealed cookie between its
 * options request and its verify request. A challenge is good for one verify
 * request and for the ceremony it was issued for.
 */
export function makeChallenge<Payload>(cookie: ChallengeCookie<Payload>) {
  return {
    issue(context: ChallengeContext, payload: Payload) {
      context.setCookies.push(
        cookie.serialize(
          cookie.seal(payload, context.secret, context.now),
          context.secure,
        ),
      );
    },

    /** The challenge of this browser as `schema` reads it. `schema` is the payload of one ceremony. */
    take<T>(
      request: Request,
      context: ChallengeContext,
      schema: z.ZodType<T>,
    ): T {
      context.setCookies.push(cookie.clear(context.secure));
      const value = readRequestCookie(request, cookie.name);
      const payload = value
        ? cookie.open(value, context.secret, context.now)
        : null;
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new HttpError(400, "challenge_invalid");
      return parsed.data;
    },
  };
}
