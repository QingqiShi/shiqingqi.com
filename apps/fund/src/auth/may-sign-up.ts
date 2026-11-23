import { normaliseEmail } from "@tuja/server-auth/normalise-email";

/**
 * The fund has one owner. With `FUND_OWNER_EMAIL` set, only that address may
 * make an account. Without it, anyone may on a local server, and no one may
 * on a deployment.
 */
export function maySignUp(email: string): boolean {
  const owner = normaliseEmail(process.env.FUND_OWNER_EMAIL ?? "");
  if (owner) return normaliseEmail(email) === owner;
  return !process.env.VERCEL_URL;
}
