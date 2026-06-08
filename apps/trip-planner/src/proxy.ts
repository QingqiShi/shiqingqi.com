import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Gate the whole site behind a single shared password so the itinerary is not
// directly exposed to scrapers. Static assets and robots.txt stay public.
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};

const REALM = "trip";

export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  // Fail closed: never serve content if the gate is misconfigured.
  if (!password) {
    return new NextResponse("Auth not configured", { status: 503 });
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const separator = decoded.indexOf(":");
      const provided = separator === -1 ? "" : decoded.slice(separator + 1);
      if (provided === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}
