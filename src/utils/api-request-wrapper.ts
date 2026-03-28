/**
 * Makes it easier to call a route handler API that was mapped from a server function.
 */
export async function apiRequestWrapper<
  // `any` type required here to handle required fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (params: any) => Promise<unknown>,
>(apiRoute: `/api/${string}`, params: Parameters<T>[0] = {}) {
  if (typeof window === "undefined") {
    throw new Error("apiRequestWrapper called during SSR - missing prefetch");
  }
  const baseUrl = window.location.origin;
  const url = new URL(`${baseUrl}${apiRoute}`);
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, `${item}`);
      }
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      url.searchParams.set(key, `${value}`);
    }
  }
  const response = await fetch(url.toString(), {
    // 24 Hours
    cache: "force-cache",
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = (await response.json()) as Record<string, unknown>;
      errorMessage = `${response.statusText}: ${JSON.stringify(errorData)}`;
    } catch {
      // Response body is not valid JSON
    }
    throw new Error(errorMessage);
  }
  return response.json() as ReturnType<T>;
}
