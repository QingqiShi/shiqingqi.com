// Shared password-gate config for trips. Imported by both the proxy (edge
// middleware) and the unlock server action (node), so this module must stay
// runtime-agnostic: web-standard crypto and process.env only — no next/headers.
//
// Each trip is gated independently. Unlocking one trip never unlocks another:
// every trip has its own cookie, and the cookie value is salted with a per-trip
// realm, so two trips that happen to share a password still can't swap unlocks.

export interface TripGate {
  /** Cookie that records an unlock for this trip — distinct per trip. */
  cookie: string;
  /** Per-trip salt folded into the cookie token so hashes can't be reused
   *  across trips even if two passwords collide. */
  realm: string;
  password: string | undefined;
}

// One gate per trip slug in src/data/trips. Passwords are read statically so
// Next can inline them into the edge bundle; a trip whose variable is unset
// fails closed until it gets one. The "gb" realm and cookie keep their
// pre-multi-trip names so unlocks from before the multi-trip split survive.
const gates: Record<string, TripGate | undefined> = {
  gb: {
    cookie: "trip_gate",
    realm: "trip",
    password: process.env.SITE_PASSWORD_GB,
  },
  tuscany: {
    cookie: "trip_gate_tuscany",
    realm: "trip-tuscany",
    password: process.env.SITE_PASSWORD_TUSCANY,
  },
};

export function tripGate(slug: string): TripGate | undefined {
  return gates[slug];
}

// ~90 days: unlock once, stay unlocked across browser sessions.
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

// Derive an unguessable cookie value from the password so the cookie can't be
// forged, without storing the password itself at rest.
export async function gateToken(realm: string, password: string) {
  const data = new TextEncoder().encode(`${realm}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
