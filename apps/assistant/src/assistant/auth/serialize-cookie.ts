interface CookieOptions {
  maxAgeSeconds: number;
  path: string;
  secure: boolean;
  sameSite: "Lax" | "Strict";
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${String(options.maxAgeSeconds)}`,
    `Path=${options.path}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
    ...(options.secure ? ["Secure"] : []),
  ].join("; ");
}
