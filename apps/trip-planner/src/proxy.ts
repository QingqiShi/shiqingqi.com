import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Gate the whole site behind a single shared password so the itinerary is not
// directly exposed to scrapers. Static assets and robots.txt stay public.
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};

const REALM = "trip";
const COOKIE_NAME = "trip_gate";
// Basic Auth credentials are dropped when the browser session ends, forcing a
// re-prompt every new session. A persistent cookie survives that, so visitors
// unlock once and stay unlocked for ~90 days.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

// Derive an unguessable cookie value from the password so the cookie cannot be
// forged, without storing the password itself at rest.
async function gateToken(password: string) {
  const data = new TextEncoder().encode(`${REALM}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  // Fail closed: never serve content if the gate is misconfigured.
  if (!password) {
    return new NextResponse("Auth not configured", { status: 503 });
  }

  const expected = await gateToken(password);

  // Already unlocked in a previous session — skip the prompt entirely.
  if (req.cookies.get(COOKIE_NAME)?.value === expected) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const separator = decoded.indexOf(":");
      const provided = separator === -1 ? "" : decoded.slice(separator + 1);
      if (provided === password) {
        // Remember the unlock so future browser sessions skip the prompt.
        const res = NextResponse.next();
        res.cookies.set(COOKIE_NAME, expected, {
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
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}
