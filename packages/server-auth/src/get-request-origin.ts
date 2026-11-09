/**
 * The origin the browser used to reach this server, from the Host and
 * X-Forwarded-Proto headers; the fallback fills what they leave out.
 */
export function getOriginFromHeaders(headers: Headers, fallback: URL): string {
  const host = headers.get("Host") ?? fallback.host;
  const forwardedProto = headers.get("X-Forwarded-Proto");
  const protocol = forwardedProto
    ? `${forwardedProto.split(",")[0]?.trim()}:`
    : fallback.protocol;
  return `${protocol}//${host}`.toLowerCase();
}

/**
 * The origin the browser used to reach this server. In development Next
 * builds `request.url` from its listen port, so the Host header wins.
 */
export function getRequestOrigin(request: Request): string {
  return getOriginFromHeaders(request.headers, new URL(request.url));
}
