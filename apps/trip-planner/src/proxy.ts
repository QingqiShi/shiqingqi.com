import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gateToken, tripGate } from "@/lib/trip-gate";

// Gate each trip behind its own password so an itinerary is only readable by
// the people on that trip. The home picker stays open — it reveals nothing
// beyond trip titles and dates — and static assets and robots.txt stay public.
//
// Locked trips are sent to an in-app unlock form (`/unlock/<slug>`) instead of
// an HTTP Basic Auth challenge. Basic Auth let the browser cache one trip's
// credentials and re-send them to every same-origin request — which silently
// unlocked the other trip and popped a password dialog on the public homepage
// (where the trip links are prefetched). A form-plus-cookie flow keeps each
// trip's unlock to itself and never prompts on a page the visitor can read.
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};

export async function proxy(req: NextRequest) {
  const segment = req.nextUrl.pathname.split("/")[1];
  const gate = tripGate(segment);

  // Not a trip route (the picker, the unlock form, 404s…) — nothing to gate.
  if (!gate) return NextResponse.next();

  // Fail closed: never serve a trip if its gate is misconfigured.
  if (!gate.password) {
    return new NextResponse("Auth not configured", { status: 503 });
  }

  const expected = await gateToken(gate.realm, gate.password);

  // Already unlocked (this or a previous session) — let the trip through.
  if (req.cookies.get(gate.cookie)?.value === expected) {
    return NextResponse.next();
  }

  // Locked: send the visitor to this trip's unlock form. A successful unlock
  // sets the cookie and returns them here.
  const unlock = req.nextUrl.clone();
  unlock.pathname = `/unlock/${segment}`;
  return NextResponse.redirect(unlock);
}
