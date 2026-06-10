import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Gate each trip behind its own password so an itinerary is only readable by
// the people on that trip. The home picker stays open — it reveals nothing
// beyond trip titles and dates — and static assets and robots.txt stay public.
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};

// Basic Auth credentials are dropped when the browser session ends, forcing a
// re-prompt every new session. A persistent cookie survives that, so visitors
// unlock once and stay unlocked for ~90 days.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

interface TripGate {
  /** Basic Auth realm — distinct per trip so browsers don't reuse the other
   *  trip's saved credentials. */
  realm: string;
  cookie: string;
  password: string | undefined;
}

// One gate per trip slug in src/data/trips. Passwords are read statically so
// Next can inline them into the middleware bundle; SITE_PASSWORD is the
// shared fallback for any trip without its own. The "gb" realm and cookie
// keep their pre-multi-trip names so existing unlocks survive.
const gates: Record<string, TripGate | undefined> = {
  gb: {
    realm: "trip",
    cookie: "trip_gate",
    password: process.env.SITE_PASSWORD_GB ?? process.env.SITE_PASSWORD,
  },
  tuscany: {
    realm: "trip-tuscany",
    cookie: "trip_gate_tuscany",
    password: process.env.SITE_PASSWORD_TUSCANY ?? process.env.SITE_PASSWORD,
  },
};

// Derive an unguessable cookie value from the password so the cookie cannot be
// forged, without storing the password itself at rest.
async function gateToken(realm: string, password: string) {
  const data = new TextEncoder().encode(`${realm}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const segment = req.nextUrl.pathname.split("/")[1];
  const gate = gates[segment];

  // Not a trip route (the picker, 404s…) — nothing secret to protect.
  if (!gate) return NextResponse.next();

  // Fail closed: never serve a trip if its gate is misconfigured.
  if (!gate.password) {
    return new NextResponse("Auth not configured", { status: 503 });
  }

  const expected = await gateToken(gate.realm, gate.password);

  // Already unlocked in a previous session — skip the prompt entirely.
  if (req.cookies.get(gate.cookie)?.value === expected) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const separator = decoded.indexOf(":");
      const provided = separator === -1 ? "" : decoded.slice(separator + 1);
      if (provided === gate.password) {
        // Remember the unlock so future browser sessions skip the prompt.
        const res = NextResponse.next();
        res.cookies.set(gate.cookie, expected, {
          httpOnly: true,
          secure: req.nextUrl.protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: COOKIE_MAX_AGE,
        });
        return res;
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${gate.realm}", charset="UTF-8"`,
    },
  });
}
