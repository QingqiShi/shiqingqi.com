export function needsSecureCookie(origin: string): boolean {
  const url = new URL(origin);
  return !(url.protocol === "http:" && url.hostname === "localhost");
}
