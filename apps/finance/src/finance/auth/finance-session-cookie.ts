import { serializeCookie } from "./serialize-cookie.ts";

const NAME = "finance_session";
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
const DEMO_MAX_AGE_SECONDS = 24 * 60 * 60;

export const financeSessionCookie = {
  name: NAME,
  maxAgeSeconds: MAX_AGE_SECONDS,
  /** The demo is a shared user, so each visitor's session is short. */
  demoMaxAgeSeconds: DEMO_MAX_AGE_SECONDS,
  serialize(
    token: string,
    secure: boolean,
    maxAgeSeconds = MAX_AGE_SECONDS,
  ): string {
    return serializeCookie(NAME, token, {
      maxAgeSeconds,
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
