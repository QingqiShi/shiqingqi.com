import { z } from "zod";
import { makeSealedCookie } from "#src/assistant/auth/make-sealed-cookie.ts";
import { OAUTH_PROVIDERS } from "./oauth-providers.ts";

/**
 * Carries the state and PKCE verifier of one OAuth connect from the start
 * route to the callback. `Lax`: the callback is a redirect from the
 * provider's site, and a `Strict` cookie would not come with it.
 */
export const connectCookie = makeSealedCookie({
  name: "assistant_connect",
  maxAgeSeconds: 10 * 60,
  path: "/api/connect",
  sameSite: "Lax",
  schema: z.object({
    provider: z.enum(OAUTH_PROVIDERS),
    state: z.string().min(16),
    codeVerifier: z.string().min(43),
    userId: z.uuid(),
    locale: z.enum(["en", "zh"]),
  }),
});
