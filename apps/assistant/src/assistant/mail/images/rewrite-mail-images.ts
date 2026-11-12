import { Tokenizer } from "htmlparser2";
import { isTrackerUrl } from "./is-tracker-url.ts";
import { remoteImageUrl } from "./make-mail-image-links.ts";

/** A pixel this small or smaller is there to count opens. */
const PIXEL_MAX = 2;
/** Past this many image references in one mail, the rest stay as they are, which the frame's CSP does not load. */
const MAX_IMAGE_REFERENCES = 300;
/*
 * This pattern takes linear time on 10 MB of CSS: the whitespace before and
 * after the URL cannot match the same characters, and a URL without quotes
 * has no `(`, as in CSS, so each `url(` stops at the next.
 */
const CSS_URL = /url\(\s*(?:"([^"]*)"\s*|'([^']*)'\s*|([^()\s"']+)\s*)?\)/gi;
const ATTRIBUTE_NAME = /^[^\s"'<>/=]+$/;

interface RewrittenImages {
  html: string;
  /** Web images that now load through the app's image route. */
  proxied: number;
  /** Web images left as they are, which the frame does not load. */
  unloaded: number;
  /** Tracking pixels taken out. */
  trackers: number;
}

type Attributes = Partial<Record<string, string>>;

interface Edit {
  start: number;
  end: number;
  text: string;
}

function styleDeclarations(style: string) {
  const declarations = new Map<string, string>();
  for (const part of style.split(";")) {
    const colon = part.indexOf(":");
    if (colon < 0) continue;
    declarations.set(
      part.slice(0, colon).trim().toLowerCase(),
      part
        .slice(colon + 1)
        .replace(/!important/i, "")
        .trim()
        .toLowerCase(),
    );
  }
  return declarations;
}

/** A length in CSS pixels, from `1`, `1px` or `0`; null for anything else, such as `100%`. */
function pixels(value: string | undefined) {
  const match = value ? /^(\d+(?:\.\d+)?)(?:px)?\/?$/.exec(value.trim()) : null;
  return match?.[1] ? Number(match[1]) : null;
}

function isTrackingPixel(attributes: Attributes, url: string) {
  if (isTrackerUrl(url)) return true;
  const style = styleDeclarations(attributes.style ?? "");
  const width = pixels(style.get("width")) ?? pixels(attributes.width);
  const height = pixels(style.get("height")) ?? pixels(attributes.height);
  const small = (size: number | null) => size !== null && size <= PIXEL_MAX;
  const unset = (size: number | null) => size === null;
  if (
    (small(width) && (small(height) || unset(height))) ||
    (small(height) && unset(width))
  ) {
    return true;
  }
  /*
   * A hidden image with a large size is often the phone version of a
   * picture, which a media query shows. It stays.
   */
  const hidden =
    style.get("display") === "none" || style.get("visibility") === "hidden";
  return (
    hidden &&
    !(width !== null && width > PIXEL_MAX) &&
    !(height !== null && height > PIXEL_MAX)
  );
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function openTag(name: string, attributes: Attributes, selfClosing: boolean) {
  const parts = Object.entries(attributes).flatMap(([attribute, value]) =>
    value !== undefined && ATTRIBUTE_NAME.test(attribute)
      ? [` ${attribute}="${escapeAttribute(value)}"`]
      : [],
  );
  return `<${name}${parts.join("")}${selfClosing ? " /" : ""}>`;
}

const FOREIGN_ELEMENTS = new Set(["svg", "math"]);
const HTML_INTEGRATION_ELEMENTS = new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignobject",
  "desc",
  "title",
]);
/** Deeper nesting of SVG, MathML and the HTML in them counts as this deep. */
const MAX_CONTEXT_DEPTH = 64;

interface TagHandlers {
  /** A start tag from `start` up to `end`, with lower-case names and decoded attribute values; the first of two same attributes counts. */
  onOpenTag(
    name: string,
    attributes: Attributes,
    start: number,
    end: number,
  ): void;
  /** The text of a `<style>` element, from `start` up to `end`. */
  onStyle(start: number, end: number): void;
}

/*
 * This uses the tokenizer of htmlparser2, not its Parser. The Parser keeps
 * all open elements in an array and adds each one at the front, so a mail
 * of many nested tags makes it quadratic. This function keeps only SVG,
 * MathML and the HTML parts in them, up to MAX_CONTEXT_DEPTH, because the
 * tokenizer must know if a `<style>` is CSS text or markup.
 */
function scanTags(html: string, handlers: TagHandlers) {
  const contexts: { name: string; foreign: boolean }[] = [];
  const inForeignContext = () => contexts.at(-1)?.foreign ?? false;
  let name = "";
  let start = 0;
  let pushed = false;
  let attributes: Attributes = {};
  let attributeName = "";
  let attributeValue = "";
  let styleStart: number | null = null;

  function endOpenTag(endIndex: number) {
    const end = endIndex + 1;
    handlers.onOpenTag(name, attributes, start, end);
    styleStart = name === "style" ? end : null;
  }

  const tokenizer = new Tokenizer(
    { decodeEntities: true },
    {
      isInForeignContext: inForeignContext,
      onopentagname(nameStart, nameEnd) {
        const tagName = html.slice(nameStart, nameEnd).toLowerCase();
        name = tagName === "image" && !inForeignContext() ? "img" : tagName;
        start = nameStart - 1;
        attributes = {};
        styleStart = null;
        const foreign = FOREIGN_ELEMENTS.has(name);
        pushed =
          (foreign || HTML_INTEGRATION_ELEMENTS.has(name)) &&
          contexts.length < MAX_CONTEXT_DEPTH;
        if (pushed) contexts.push({ name, foreign });
      },
      onattribname(nameStart, nameEnd) {
        attributeName = html.slice(nameStart, nameEnd).toLowerCase();
        attributeValue = "";
      },
      onattribdata(dataStart, dataEnd) {
        attributeValue += html.slice(dataStart, dataEnd);
      },
      onattribentity(codePoint) {
        attributeValue += String.fromCodePoint(codePoint);
      },
      onattribend() {
        if (!Object.hasOwn(attributes, attributeName)) {
          attributes[attributeName] = attributeValue;
        }
        attributeValue = "";
      },
      onopentagend: endOpenTag,
      onselfclosingtag(endIndex) {
        if (pushed && inForeignContext()) contexts.pop();
        endOpenTag(endIndex);
      },
      onclosetag(nameStart, nameEnd) {
        const tagName = html.slice(nameStart, nameEnd).toLowerCase();
        if (tagName === "style" && styleStart !== null) {
          handlers.onStyle(styleStart, nameStart - 2);
        }
        styleStart = null;
        const at = contexts.findLastIndex(
          (context) => context.name === tagName,
        );
        if (at >= 0) contexts.length = at;
      },
      ontext() {},
      ontextentity() {},
      oncdata() {},
      oncomment() {},
      ondeclaration() {},
      onprocessinginstruction() {},
      onend() {},
    },
  );
  tokenizer.write(html);
  tokenizer.end();
}

/**
 * Sends each web image of an HTML mail through the app: `<img src>`, the
 * `background` attribute and CSS `url()` in `style` attributes and
 * `<style>`. Tracking pixels go: a URL on the tracker list, an image of at
 * most 2 px, or one that is hidden. `srcset` goes too, because a browser
 * takes it over `src`. A URL that this misses stays as it was, and the
 * frame's CSP does not load it.
 */
export function rewriteMailImages(
  html: string,
  link: ((url: string) => string) | null,
): RewrittenImages {
  let examined = 0;
  let proxied = 0;
  let unloaded = 0;
  let trackers = 0;
  const edits: Edit[] = [];

  function webImage(raw: string) {
    if (examined >= MAX_IMAGE_REFERENCES) return null;
    const url = remoteImageUrl(raw);
    if (url) examined++;
    return url;
  }

  function load(url: string) {
    if (!link) {
      unloaded++;
      return null;
    }
    proxied++;
    return link(url);
  }

  /** The new value of a reference: "" for a tracker, null to leave it. */
  function proxy(raw: string) {
    const url = webImage(raw);
    if (!url) return null;
    if (isTrackerUrl(url)) {
      trackers++;
      return "";
    }
    return load(url);
  }

  function rewriteCss(css: string) {
    return css.replace(
      CSS_URL,
      (match, double?: string, single?: string, bare?: string) => {
        const replaced = proxy(double ?? single ?? bare ?? "");
        if (replaced === null) return match;
        return replaced ? `url("${replaced}")` : "none";
      },
    );
  }

  scanTags(html, {
    onOpenTag(name, attributes, start, end) {
      const next: Attributes = { ...attributes };
      let changed = false;
      const src = name === "img" ? webImage(next.src ?? "") : null;
      if (src && isTrackingPixel(next, src)) {
        trackers++;
        edits.push({ start, end, text: "" });
        return;
      }
      if ((name === "img" || name === "source") && "srcset" in next) {
        delete next.srcset;
        changed = true;
      }
      if (src) {
        const replaced = load(src);
        if (replaced !== null) {
          next.src = replaced;
          changed = true;
        }
      }
      if (next.background !== undefined) {
        const replaced = proxy(next.background);
        if (replaced === "") delete next.background;
        else if (replaced !== null) next.background = replaced;
        changed ||= replaced !== null;
      }
      if (next.style?.toLowerCase().includes("url(")) {
        const style = rewriteCss(next.style);
        changed ||= style !== next.style;
        next.style = style;
      }
      if (changed) {
        const selfClosing = /\/\s*>$/.test(html.slice(start, end));
        edits.push({ start, end, text: openTag(name, next, selfClosing) });
      }
    },
    onStyle(start, end) {
      const css = html.slice(start, end);
      const rewritten = rewriteCss(css);
      if (rewritten !== css) edits.push({ start, end, text: rewritten });
    },
  });

  let result = "";
  let at = 0;
  for (const edit of edits.toSorted((a, b) => a.start - b.start)) {
    if (edit.start < at) continue;
    result += html.slice(at, edit.start) + edit.text;
    at = edit.end;
  }
  return { html: result + html.slice(at), proxied, unloaded, trackers };
}
