import type { Attachment } from "postal-mime";
import { MAIL_IMAGE_PATH } from "#src/assistant/mail/images/mail-image-path.ts";
import type { MailImageLinks } from "#src/assistant/mail/images/make-mail-image-links.ts";
import { rewriteMailImages } from "#src/assistant/mail/images/rewrite-mail-images.ts";

/** Inline images of one mail, as base64, up to this much: more makes the page slow to load. */
const INLINE_IMAGE_BUDGET = 4 * 1024 * 1024;

/**
 * The frame loads images from the app's image route only, which fetches web
 * images for it; no other request goes out, so no font or style sheet loads.
 * Inline styles and images that the page puts in as data URLs stay. The
 * frame's sandbox already stops scripts and forms. The source is the route's
 * full URL, because the frame's origin is opaque and `'self'` does not match
 * the app.
 */
function mailFrameCsp(imageOrigin: string | null) {
  return [
    "default-src 'none'",
    imageOrigin
      ? `img-src data: ${imageOrigin}${MAIL_IMAGE_PATH}`
      : "img-src data:",
    "media-src data:",
    "font-src data:",
    "style-src 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/*
 * Most HTML mail sets its own text colours for a white page, as mail apps
 * show it, so the frame is a white page in dark mode too.
 *
 * `height: auto` is only for an image with a `width` attribute. A style
 * sheet overrides the `height` attribute, so an image with only a `height`
 * attribute then shows at the size of its file.
 */
const FRAME_STYLE = `
:root { color-scheme: light; }
html { background: #fff; color: #1f1f1f; padding: 8px; }
body { margin: 8px; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow-wrap: break-word; }
img { max-width: 100%; }
img[width] { height: auto; }
table { max-width: 100%; }
pre { white-space: pre-wrap; }
a { color: #0b57d0; }
`;

function cidOf(contentId: string) {
  return contentId.trim().replace(/^<|>$/g, "").toLowerCase();
}

function decoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** The `cid:` images of the mail as data URLs, while they fit the budget. */
function inlineImages(attachments: readonly Attachment[]) {
  const images = new Map<string, string>();
  let used = 0;
  for (const attachment of attachments) {
    if (
      !attachment.contentId ||
      !attachment.mimeType.startsWith("image/") ||
      typeof attachment.content !== "string" ||
      attachment.encoding !== "base64"
    ) {
      continue;
    }
    used += attachment.content.length;
    if (used > INLINE_IMAGE_BUDGET) break;
    images.set(
      cidOf(attachment.contentId),
      `data:${attachment.mimeType};base64,${attachment.content}`,
    );
  }
  return images;
}

/*
 * The sender writes the HTML and it can be 10 MB, so each pattern here must
 * take linear time. Thus a tag with no `>` goes to the end of the mail, and a
 * run of whitespace matches only from its first character.
 */
const UNSAFE_TAG = /<(?:meta|link|base|iframe)\b[^>]*(?:>|$)/gi;
const UNSAFE_TAG_START = /<(?=(?:meta|link|base|iframe)\b)/gi;
const REMOVAL_PASSES = 8;
const LINK_TAG = /<(?:a|area|form)\b[^>]*/gi;
const TARGET_ATTRIBUTE = /(?<!\s)\s+target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const SPACE_BETWEEN_TAGS = />[\s\uFFFD]*</g;

/*
 * Some senders damage the indentation between tags and leave U+FFFD there.
 * A browser moves text out of a table, so each run would show above it.
 * A U+FFFD in real text stays, because it shows real damage.
 */
function withoutIndentReplacementChars(html: string) {
  if (!html.includes("\uFFFD")) return html;
  return html.replace(SPACE_BETWEEN_TAGS, (run) =>
    run.replaceAll("\uFFFD", ""),
  );
}

/*
 * These tags can load from the network past the CSP: a refresh `<meta>`
 * loads a web page into the frame, a preconnect `<link>` opens a connection
 * that the CSP does not check, and an `<iframe srcdoc>` holds a document that
 * this function does not see. A removal can join the text around it into a
 * new tag, such as `<<meta>meta`, so the last step does not remove: it
 * changes the `<` of each remaining such tag to `&lt;`, and the tag shows as
 * text. A browser makes an element only from a literal `<` and its name.
 */
function withoutUnsafeTags(html: string) {
  let result = html;
  for (let pass = 0; pass < REMOVAL_PASSES; pass++) {
    const next = result.replace(UNSAFE_TAG, "");
    if (next === result) break;
    result = next;
  }
  return result.replace(UNSAFE_TAG_START, "&lt;");
}

export interface MailFrame {
  /** The `srcdoc` of the frame. */
  document: string;
  /** Web images that load through the app. */
  proxiedImages: number;
  /** Web images that do not load, because there are no `imageLinks`. */
  unloadedImages: number;
  /** Tracking pixels taken out. */
  blockedTrackers: number;
}

/**
 * The document of the frame that shows an HTML mail, for `srcdoc`. Its own
 * head comes first, so its CSP, referrer policy and base target win over the
 * mail's: the first `<base>` of a document counts, and each CSP adds limits.
 * The mail's links lose their `target`, so that each opens in a new tab. With
 * no `imageLinks`, web images stay as they are and do not load, and the
 * tracking pixels still go.
 */
export function mailFrameDocument(
  html: string,
  attachments: readonly Attachment[],
  imageLinks: MailImageLinks | null,
): MailFrame {
  const images = inlineImages(attachments);
  const withInlineImages = withoutIndentReplacementChars(html)
    .replace(
      /cid:([^"'\s)>]+)/gi,
      (match, id: string) => images.get(cidOf(decoded(id))) ?? match,
    )
    .replace(LINK_TAG, (tag) => tag.replace(TARGET_ATTRIBUTE, ""));
  const rewritten = rewriteMailImages(
    withInlineImages,
    imageLinks?.link ?? null,
  );
  const body = withoutUnsafeTags(rewritten.html);
  const document = [
    "<!doctype html><html><head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${mailFrameCsp(imageLinks?.origin ?? null)}">`,
    '<meta name="referrer" content="no-referrer">',
    '<meta http-equiv="x-dns-prefetch-control" content="off">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<base target="_blank">',
    `<style>${FRAME_STYLE}</style>`,
    "</head><body>",
    body,
    "</body></html>",
  ].join("");
  return {
    document,
    proxiedImages: rewritten.proxied,
    unloadedImages: rewritten.unloaded,
    blockedTrackers: rewritten.trackers,
  };
}
