import { z } from "zod";

const idTokenClaimsSchema = z.object({
  email: z.string().optional(),
  preferred_username: z.string().optional(),
});

/**
 * The mailbox address in an ID token. The token came straight from the
 * provider's token endpoint over TLS, so its signature is not checked
 * (OpenID Connect Core 3.1.3.7).
 */
export function emailOfIdToken(idToken: string | null): string | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = idTokenClaimsSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!claims.success) return null;
    const email = claims.data.email ?? claims.data.preferred_username;
    return email?.includes("@") ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}
