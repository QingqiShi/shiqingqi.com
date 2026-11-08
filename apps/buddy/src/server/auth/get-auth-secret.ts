/**
 * `BUDDY_AUTH_SECRET`: it signs the passkey challenge cookie and the Redis
 * copy of each Mac's key. Set it once per deployment; a new value makes open
 * challenges and every Mac key in Redis fail their check until the daily
 * cron writes the keys again from Postgres.
 */
export function getAuthSecret(): string | undefined {
  return process.env.BUDDY_AUTH_SECRET || undefined;
}

export function requireAuthSecret(): string {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error(
      "Set BUDDY_AUTH_SECRET: it signs the Redis copy of the Mac keys. `pnpm dev` sets one.",
    );
  }
  return secret;
}
