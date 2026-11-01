import { validateLocale } from "@tuja/i18n/validate-locale";
import { buildManifest } from "#src/assistant/pwa/build-manifest.ts";

export async function GET(
  _request: Request,
  context: RouteContext<"/[locale]/manifest.webmanifest">,
) {
  const locale = validateLocale((await context.params).locale);
  return Response.json(buildManifest(locale), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
