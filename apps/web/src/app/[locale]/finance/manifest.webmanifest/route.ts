import { buildFinanceManifest } from "#src/finance/pwa/build-finance-manifest.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";

export async function GET(
  _request: Request,
  context: RouteContext<"/[locale]/finance/manifest.webmanifest">,
) {
  const locale = validateLocale((await context.params).locale);
  return Response.json(buildFinanceManifest(locale), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
