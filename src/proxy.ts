import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { ALLOWED_REFERER } from "#src/constants.ts";
import { i18nConfig } from "./i18n-config";

function validateReferer(request: NextRequest): NextResponse | null {
  const referer = request.headers.get("Referer") ?? "";
  if (!referer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const refererUrl = new URL(referer);
    const isLocalhost =
      refererUrl.hostname === "localhost" && refererUrl.protocol === "http:";
    const isAllowedReferer = ALLOWED_REFERER.some((allowedReferer) =>
      refererUrl.origin.endsWith(allowedReferer),
    );
    if (!isLocalhost && !isAllowedReferer) {
      throw new Error("Unauthorized");
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return null;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return validateReferer(request) ?? NextResponse.next();
  }

  return i18nRouter(request, i18nConfig);
}

export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"],
};
