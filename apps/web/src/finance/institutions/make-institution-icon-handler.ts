import type { FinanceSession } from "../auth/types.ts";
import type { FinanceDb } from "../db/types.ts";
import { asFinanceApp } from "../db/with-household.ts";
import { isInstitutionDomain } from "../domain/accounts/parse-institution-domain.ts";
import { financeJson } from "../http/finance-json.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { institutionCacheRepository } from "./institution-cache-repository.ts";

interface InstitutionIconHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
}

/** The second argument Next.js passes a handler of a `[domain]` route. */
interface InstitutionIconRouteContext {
  params: Promise<{ domain: string }>;
}

/** A day keeps the rows of a long list from asking again on every view, and a refreshed icon shows by the next day. */
const CACHE_CONTROL = "private, max-age=86400";

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

    const db = dependencies.getDb();
    const version = await asFinanceApp(db, (app) =>
      institutionCacheRepository.findIconVersion(app, domain),
    );
    if (version === null) return notFound();
    if (request.headers.get("If-None-Match") === etagOf(version)) {
      return new Response(null, { status: 304, headers: headersOf(version) });
    }
    const icon = await asFinanceApp(db, (app) =>
      institutionCacheRepository.findIcon(app, domain),
    );
    if (!icon || !isOnArrayBuffer(icon.image)) return notFound();
    return new Response(icon.image, {
      headers: { ...headersOf(icon.version), "Content-Type": "image/webp" },
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

function etagOf(version: string) {
  return `"${version}"`;
}

function headersOf(version: string) {
  return {
    "Cache-Control": CACHE_CONTROL,
    ETag: etagOf(version),
    "X-Content-Type-Options": "nosniff",
  };
}
