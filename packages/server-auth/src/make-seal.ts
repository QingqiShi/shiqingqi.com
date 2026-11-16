import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** `purpose` is signed with the payload, so a value sealed for one purpose does not open for another. */
export function makeSeal<T>({
  purpose,
  schema,
  maxAgeSeconds,
}: {
  purpose: string;
  schema: z.ZodType<T>;
  maxAgeSeconds?: number;
}) {
  const sealedSchema = z.object({
    payload: schema,
    exp: z.number().optional(),
  });

  function sign(body: string, secret: string): Buffer {
    return createHmac("sha256", secret).update(`${purpose}.${body}`).digest();
  }

  return {
    seal(payload: T, secret: string, now = new Date()): string {
      const exp =
        maxAgeSeconds === undefined
          ? undefined
          : now.getTime() + maxAgeSeconds * 1000;
      const body = Buffer.from(JSON.stringify({ payload, exp })).toString(
        "base64url",
      );
      return `${body}.${sign(body, secret).toString("base64url")}`;
    },

    open(value: string, secret: string, now = new Date()): T | null {
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
      const parsed = sealedSchema.safeParse(decoded);
      if (!parsed.success) return null;
      const { exp } = parsed.data;
      if (
        maxAgeSeconds !== undefined &&
        (exp === undefined || exp <= now.getTime())
      ) {
        return null;
      }
      return parsed.data.payload;
    },
  };
}
