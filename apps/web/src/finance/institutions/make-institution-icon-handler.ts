import type { FinanceDb } from "../db/types.ts";
import { asFinanceApp } from "../db/with-household.ts";
import { isInstitutionDomain } from "../domain/accounts/parse-institution-domain.ts";
import { financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardDependencies,
} from "../http/guard-finance-request.ts";
import { institutionCacheRepository } from "./institution-cache-repository.ts";

interface InstitutionIconHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
}

/** The second argument Next.js passes a handler of a `[domain]` route. */
interface InstitutionIconRouteContext {
  params: Promise<{ domain: string }>;
}

/** The URL of an icon holds its version, so a new icon gets a new URL. */
const CACHE_CONTROL = "private, max-age=31536000, immutable";

/**
 * `GET /api/finance/institution-icons/[domain]`: the cached icon of an
 * institution's domain. Only a signed-in Member may read it; it never
 * fetches anything, so a request cannot make the server call a site.
 */
export function makeInstitutionIconHandler(
  dependencies: InstitutionIconHandlerDependencies,
) {
  return async function GET(
    request: Request,
    context: InstitutionIconRouteContext,
  ) {
    const session = await guardFinanceRequest(dependencies, request, {
      write: false,
    });
    if (session instanceof Response) return session;
    const { domain } = await context.params;
    if (!isInstitutionDomain(domain)) return notFound();

    const image = await asFinanceApp(dependencies.getDb(), (app) =>
      institutionCacheRepository.findIconImage(app, domain),
    );
    if (!image || !isOnArrayBuffer(image)) return notFound();
    return new Response(image, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}

/** Every driver gives bytea on an `ArrayBuffer`; the check lets `Response` take the bytes without a copy. */
function isOnArrayBuffer(bytes: Uint8Array): bytes is Uint8Array<ArrayBuffer> {
  return bytes.buffer instanceof ArrayBuffer;
}

function notFound() {
  return financeJson({ error: "not-found" }, { status: 404 });
}
