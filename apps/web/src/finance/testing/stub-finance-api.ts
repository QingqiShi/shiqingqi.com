import { vi } from "vitest";

type Route = (body: unknown) => { status?: number; json?: unknown };

/**
 * Stubs `fetch` to answer the Finance routes by "METHOD /path", and records
 * each call. A route that is not given fails as if offline. Undo it with
 * `vi.unstubAllGlobals()`.
 */
export function stubFinanceApi(routes: Record<string, Route>) {
  const calls: { route: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    const url = new URL(input, "http://localhost");
    const route = `${init.method ?? "GET"} ${url.pathname}`;
    const body: unknown =
      typeof init.body === "string" ? JSON.parse(init.body) : null;
    calls.push({ route, body });
    if (!(route in routes)) {
      return Promise.reject(new Error(`offline: ${route}`));
    }
    const handler = routes[route];
    const answer = handler(body);
    return Promise.resolve(
      new Response(
        answer.json === undefined ? null : JSON.stringify(answer.json),
        { status: answer.status ?? 200 },
      ),
    );
  });
  return calls;
}
