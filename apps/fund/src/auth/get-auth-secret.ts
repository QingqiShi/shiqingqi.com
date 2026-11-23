/**
 * `FUND_AUTH_SECRET`: it seals the passkey challenge cookie and the cookie
 * of an emailed code. Set it once per deployment; a new value ends the
 * sign-ins that are open at that moment.
 */
export function getAuthSecret(): string | undefined {
  return process.env.FUND_AUTH_SECRET || undefined;
}
