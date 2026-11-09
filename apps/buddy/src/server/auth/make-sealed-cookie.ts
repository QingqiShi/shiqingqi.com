import { serializeCookie } from "@tuja/server-auth/serialize-cookie";
import type { z } from "zod";
import { makeSeal } from "./make-seal.ts";

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
  return {
    name,
    ...makeSeal({ purpose: name, schema, maxAgeSeconds }),
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
