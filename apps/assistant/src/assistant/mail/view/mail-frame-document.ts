import type { Attachment } from "postal-mime";

/** Inline images of one mail, as base64, up to this much: more makes the page slow to load. */
const INLINE_IMAGE_BUDGET = 4 * 1024 * 1024;

/**
 * Nothing loads from the network: no tracking pixel, remote image, font or
 * style sheet. Inline styles and images that the page puts in as data URLs
 * stay. The frame's sandbox already stops scripts and forms.
 */
const MAIL_FRAME_CSP = [
  "default-src 'none'",
  "img-src data:",
  "media-src data:",
  "font-src data:",
  "style-src 'unsafe-inline'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/*
 * Most HTML mail sets its own text colours for a white page, as mail apps
 * show it, so the frame is a white page in dark mode too.
 */
const FRAME_STYLE = `
:root { color-scheme: light; }
html { background: #fff; color: #1f1f1f; padding: 8px; }
body { margin: 8px; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow-wrap: break-word; }
img { max-width: 100%; height: auto; }
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

/** True when the mail asks for images or styles from the web, which the frame does not load. */
export function hasRemoteContent(html: string) {
  return /(?:src|background)\s*=\s*["']?\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\//i.test(
    html,
  );
}

const UNSAFE_TAG = /<(?:meta|link|base|iframe)\b[^>]*>/gi;
const UNSAFE_TAG_START = /<(?=(?:meta|link|base|iframe)\b)/gi;
const REMOVAL_PASSES = 8;

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

/**
 * The document of the frame that shows an HTML mail, for `srcdoc`. Its own
 * head comes first, so its CSP, referrer policy and base target win over the
 * mail's: the first `<base>` of a document counts, and each CSP adds limits.
 * The mail's links lose their `target`, so that each opens in a new tab.
 */
export function mailFrameDocument(
  html: string,
  attachments: readonly Attachment[],
): string {
  const images = inlineImages(attachments);
  const body = withoutUnsafeTags(
    html
      .replace(
        /cid:([^"'\s)>]+)/gi,
        (match, id: string) => images.get(cidOf(decoded(id))) ?? match,
      )
      .replace(
        /(<(?:a|area|form)\b[^>]*?)\s+target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
        "$1",
      ),
  );
  return [
    "<!doctype html><html><head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${MAIL_FRAME_CSP}">`,
    '<meta name="referrer" content="no-referrer">',
    '<meta http-equiv="x-dns-prefetch-control" content="off">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<base target="_blank">',
    `<style>${FRAME_STYLE}</style>`,
    "</head><body>",
    body,
    "</body></html>",
  ].join("");
}
