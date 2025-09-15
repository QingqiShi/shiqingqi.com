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
  for (const entry of Object.entries(params)) {
    if (entry[1]) {
      if (Array.isArray(entry[1])) {
        entry[1].forEach((value) => {
          url.searchParams.append(entry[0], String(value));
        });
      } else {
        url.searchParams.set(entry[0], String(entry[1] as unknown));
      }
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
