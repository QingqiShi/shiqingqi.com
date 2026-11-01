import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { serializeCookie } from "./serialize-cookie.ts";

/**
 * An HttpOnly cookie on one route prefix that holds a signed, expiring
 * payload. The cookie's name is part of what is signed, so that a value of
 * one sealed cookie does not open as another.
 */
export function makeSealedCookie<T>({
  name,
  maxAgeSeconds,
  schema,
  path = "/api/auth",
  sameSite = "Strict",
}: {
  name: string;
  maxAgeSeconds: number;
  schema: z.ZodType<T>;
  path?: string;
  /** `Lax` for a cookie that must come back on a redirect from another site. */
  sameSite?: "Lax" | "Strict";
}) {
  const signedSchema = z.object({ payload: schema, exp: z.number() });

  function sign(body: string, secret: string): Buffer {
    return createHmac("sha256", secret).update(`${name}.${body}`).digest();
  }

  return {
    name,
    seal(payload: T, secret: string, now: Date): string {
      const body = Buffer.from(
        JSON.stringify({ payload, exp: now.getTime() + maxAgeSeconds * 1000 }),
      ).toString("base64url");
      return `${body}.${sign(body, secret).toString("base64url")}`;
    },
    open(value: string, secret: string, now: Date): T | null {
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
      return serializeCookie(name, value, {
        maxAgeSeconds,
        path,
        secure,
        sameSite,
      });
    },
    clear(secure: boolean): string {
      return serializeCookie(name, "", {
        maxAgeSeconds: 0,
        path,
        secure,
        sameSite,
      });
    },
  };
}
