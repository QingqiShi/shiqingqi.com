import {
  fetchPublicImage,
  type FetchImageOptions,
} from "./fetch-public-image.ts";
import { openMailImageLink } from "./make-mail-image-links.ts";

const SAFE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; sandbox",
  "Referrer-Policy": "no-referrer",
};

function refusal(status: number) {
  return new Response(null, {
    status,
    headers: { ...SAFE_HEADERS, "Cache-Control": "no-store" },
  });
}

/**
 * `GET /api/mail-image`: one web image of a mail, fetched now and stored
 * nowhere. The signed link is the only check. The mail frame has an opaque
 * origin and sends no Referer, and a browser does not send it the session
 * cookie.
 */
export async function serveMailImage(
  request: Request,
  {
    secret,
    now,
    fetchOptions,
  }: {
    secret: string | undefined;
    now: Date;
    fetchOptions?: FetchImageOptions;
  },
): Promise<Response> {
  const link = secret
    ? openMailImageLink(new URL(request.url).searchParams, secret, now)
    : null;
  if (!link) return refusal(403);
  const image = await fetchPublicImage(link.url, fetchOptions);
  if (!image.ok) return refusal(502);
  const maxAge = Math.floor((link.expiresAt.getTime() - now.getTime()) / 1000);
  const { body } = image;
  return new Response(
    new Uint8Array(body.buffer, body.byteOffset, body.length),
    {
      headers: {
        ...SAFE_HEADERS,
        "Content-Type": image.contentType,
        "Cache-Control": `private, max-age=${String(maxAge)}`,
      },
    },
  );
}
