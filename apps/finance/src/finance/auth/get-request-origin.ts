/**
 * The origin the browser used to reach this server. In development Next
 * builds `request.url` from its listen port, so the Host header wins.
 */
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("Host") ?? url.host;
  const forwardedProto = request.headers.get("X-Forwarded-Proto");
  const protocol = forwardedProto
    ? `${forwardedProto.split(",")[0]?.trim()}:`
    : url.protocol;
  return `${protocol}//${host}`.toLowerCase();
}
