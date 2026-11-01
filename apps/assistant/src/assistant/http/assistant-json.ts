/** Every Assistant API response is private to the signed-in user and never cached. */
export const NO_STORE = "private, no-store";

/** A JSON response that no cache keeps. */
export function assistantJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", NO_STORE);
  return Response.json(body, { ...init, headers });
}

/** An empty 204 response that no cache keeps. */
export function assistantNoContent() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": NO_STORE },
  });
}
