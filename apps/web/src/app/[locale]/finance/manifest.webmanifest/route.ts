import { validateLocale } from "@tuja/i18n/validate-locale";
import { buildFinanceManifest } from "#src/finance/pwa/build-finance-manifest.ts";

export async function GET(
  _request: Request,
  context: RouteContext<"/[locale]/finance/manifest.webmanifest">,
) {
  const locale = validateLocale((await context.params).locale);
  return Response.json(buildFinanceManifest(locale), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
