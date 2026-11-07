import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { MAIL_IMAGE_PATH } from "./mail-image-path.ts";

const HOUR_SECONDS = 60 * 60;
/** A link works for 6 to 7 hours: the hour it was made in, plus 6. */
const LIFETIME_HOURS = 6;
const MAX_URL_LENGTH = 4096;

const keys = new Map<string, Buffer>();

function keyOf(secret: string) {
  let key = keys.get(secret);
  if (!key) {
    key = Buffer.from(
      hkdfSync("sha256", secret, "", "assistant mail image link v1", 32),
    );
    keys.set(secret, key);
  }
  return key;
}

function signatureOf(key: Buffer, encodedUrl: string, expires: string) {
  return createHmac("sha256", key).update(`${expires}.${encodedUrl}`).digest();
}

/** The web address of a mail's image, as https when the mail leaves out the scheme; null for anything else. */
export function remoteImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  const absolute = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  if (!/^https?:\/\//i.test(absolute)) return null;
  let url: URL;
  try {
    url = new URL(absolute);
  } catch {
    return null;
  }
  return url.href.length > MAX_URL_LENGTH ? null : url.href;
}

/** Makes the links of the mail page's images to this app's image route. */
export interface MailImageLinks {
  /** The app's own origin, which the frame's CSP lets images load from. */
  origin: string;
  link: (url: string) => string;
}

/**
 * Signs links to `MAIL_IMAGE_PATH`, so that the route fetches only what this
 * app put in a page. The key comes from `ASSISTANT_AUTH_SECRET` through HKDF
 * with its own label, so it signs nothing else. Links made in the same hour
 * are the same, and the browser can cache the image.
 */
export function makeMailImageLinks(
  origin: string,
  secret: string,
  now: Date,
): MailImageLinks {
  const key = keyOf(secret);
  const expires = String(
    (Math.floor(now.getTime() / 1000 / HOUR_SECONDS) + 1 + LIFETIME_HOURS) *
      HOUR_SECONDS,
  );
  return {
    origin,
    link(url) {
      const encodedUrl = Buffer.from(url).toString("base64url");
      const params = new URLSearchParams({
        u: encodedUrl,
        e: expires,
        s: signatureOf(key, encodedUrl, expires).toString("base64url"),
      });
      return `${origin}${MAIL_IMAGE_PATH}?${params}`;
    },
  };
}

/** The image URL of a link that this app signed and that has not expired, with when it expires. */
export function openMailImageLink(
  params: URLSearchParams,
  secret: string,
  now: Date,
): { url: string; expiresAt: Date } | null {
  const encodedUrl = params.get("u");
  const expires = params.get("e");
  const signature = params.get("s");
  if (!encodedUrl || !expires || !signature || !/^\d{1,12}$/.test(expires)) {
    return null;
  }
  const expected = signatureOf(keyOf(secret), encodedUrl, expires);
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  const expiresAt = new Date(Number(expires) * 1000);
  if (expiresAt.getTime() <= now.getTime()) return null;
  const url = remoteImageUrl(
    Buffer.from(encodedUrl, "base64url").toString("utf8"),
  );
  return url ? { url, expiresAt } : null;
}
