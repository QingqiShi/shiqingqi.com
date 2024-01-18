import { i18nRouter } from "next-i18n-router";
import type { NextRequest } from "next/server";
import { i18nConfig } from "./i18nConfig";

export function middleware(request: NextRequest) {
  // Set the initial theme as cookie so we can access it from the root layout.tsx
  const requestedTheme = request.nextUrl.searchParams.get("theme");
  if (requestedTheme) {
    request.cookies.set("theme", requestedTheme);
  } else {
    request.cookies.delete("theme");
  }

  return i18nRouter(request, i18nConfig);
}

export const config = {
  // Only applies this middleware to files in the app directory
  matcher: "/((?!api|static|.*\\..*|_next).*)",
};
