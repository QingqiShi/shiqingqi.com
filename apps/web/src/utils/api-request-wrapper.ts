/**
 * Appends `params` as query string entries. Takes a concrete parameter type
 * (rather than the caller's generic `Parameters<T>[0]`) so a missing/empty
 * `params` can default safely — inside a generic function, `Parameters<T>[0]`
 * only ever resolves to the constraint's `never`, which can't hold a runtime
 * default.
 */
function appendSearchParams(
  url: URL,
  params: Record<string, unknown> | undefined,
) {
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      url.searchParams.set(key, String(value));
    }
  }
}

/**
 * Makes it easier to call a route handler API that was mapped from a server function.
 */
export async function apiRequestWrapper<
  // `never` (not `any`) so the constraint accepts server functions whose
  // params have required fields: function parameters are contravariant, and
  // every param type is assignable to `never`'s position.
  T extends (params: never) => Promise<unknown>,
>(apiRoute: `/api/${string}`, params: Parameters<T>[0]) {
  if (typeof window === "undefined") {
    throw new Error("apiRequestWrapper called during SSR - missing prefetch");
  }
  const baseUrl = window.location.origin;
  const url = new URL(`${baseUrl}${apiRoute}`);
  appendSearchParams(url, params);
  const response = await fetch(url.toString(), {
    // 24 Hours
    cache: "force-cache",
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData: unknown = await response.json();
      errorMessage = `${response.statusText}: ${JSON.stringify(errorData)}`;
    } catch {
      // Response body is not valid JSON
    }
    throw new Error(errorMessage);
  }
  // Allowed by the JSON-parse carve-out in eslint.config.mjs — a trust boundary the type system can't check.
  return response.json() as ReturnType<T>;
}
