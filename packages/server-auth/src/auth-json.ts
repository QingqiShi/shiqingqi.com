/** A JSON answer that no cache keeps, with the cookies that the route set. */
export function authJson(
  context: { setCookies: readonly string[] },
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  const headers = new Headers({
    ...extraHeaders,
    "Cache-Control": "no-store",
  });
  for (const cookie of context.setCookies) headers.append("Set-Cookie", cookie);
  return Response.json(body, { status, headers });
}
