import type { AuthHandlers } from "../make-auth-handlers.ts";

export const TEST_ORIGIN = "http://localhost:3000";

export interface TestResponse<T> {
  status: number;
  body: T;
  setCookies: string[];
}

/**
 * Calls auth handlers the way a browser on `TEST_ORIGIN` would, and keeps
 * the cookies they set between calls.
 */
export function createAuthTestClient(handlers: AuthHandlers) {
  const jar = new Map<string, string>();

  function storeCookies(response: Response): string[] {
    const setCookies = response.headers.getSetCookie();
    for (const cookie of setCookies) {
      const [pair = "", ...attributes] = cookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = decodeURIComponent(pair.slice(separator + 1).trim());
      const expired = attributes.some((attribute) =>
        /^\s*max-age=0\s*$/i.test(attribute),
      );
      if (expired || value === "") jar.delete(name);
      else jar.set(name, value);
    }
    return setCookies;
  }

  function cookieHeader(): string {
    return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  async function call<T>(
    handler: keyof AuthHandlers,
    {
      method = "POST",
      body,
      origin = TEST_ORIGIN,
    }: { method?: "GET" | "POST"; body?: unknown; origin?: string | null } = {},
  ): Promise<TestResponse<T>> {
    const headers = new Headers({
      "Content-Type": "application/json",
      "User-Agent": "vitest",
      Cookie: cookieHeader(),
    });
    if (origin !== null && method === "POST") headers.set("Origin", origin);
    const request = new Request(`${TEST_ORIGIN}/api/finance/auth/${handler}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
    const response = await handlers[handler](request);
    const setCookies = storeCookies(response);
    const responseBody = (await response.json()) as T;
    return { status: response.status, body: responseBody, setCookies };
  }

  function post<T = Record<string, unknown>>(
    handler: keyof AuthHandlers,
    body?: unknown,
    origin?: string | null,
  ) {
    return call<T>(handler, { body, origin });
  }

  function get<T = Record<string, unknown>>(handler: keyof AuthHandlers) {
    return call<T>(handler, { method: "GET" });
  }

  return { jar, post, get };
}
