/**
 * Makes it easier to call a route handler API that was mapped from a server function.
 */
export async function apiRequestWrapper<
  // `any` type required here to handle required fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (params: any) => Promise<unknown>,
>(apiRoute: `/api/${string}`, params: Parameters<T>[0] = {}) {
  const url = new URL(`${window.location.origin}${apiRoute}`);
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
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`${response.statusText}: ${await response.json()}`);
  }
  return response.json() as ReturnType<T>;
}
