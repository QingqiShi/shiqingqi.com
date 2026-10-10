import { serializeCookie } from "./serialize-cookie.ts";

const NAME = "finance_session";
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const financeSessionCookie = {
  name: NAME,
  maxAgeSeconds: MAX_AGE_SECONDS,
  serialize(token: string, secure: boolean): string {
    return serializeCookie(NAME, token, {
      maxAgeSeconds: MAX_AGE_SECONDS,
      path: "/",
      secure,
      sameSite: "Lax",
    });
  },
  clear(secure: boolean): string {
    return serializeCookie(NAME, "", {
      maxAgeSeconds: 0,
      path: "/",
      secure,
      sameSite: "Lax",
    });
  },
};
