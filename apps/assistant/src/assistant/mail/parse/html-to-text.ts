import { Parser } from "htmlparser2";

const SKIPPED = new Set(["head", "style", "script", "title", "noscript"]);
const BLOCKS = new Set([
  "p",
  "div",
  "tr",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "blockquote",
  "section",
  "article",
  "header",
  "footer",
  "ul",
  "ol",
]);
const CELLS = new Set(["td", "th"]);

function isHidden(style = "") {
  return /display\s*:\s*none/i.test(style);
}

/** The readable text of an HTML mail: no markup, scripts, styles or hidden preheaders, one line per block. */
export function htmlToText(html: string): string {
  let text = "";
  let hiddenDepth = 0;
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (
          hiddenDepth > 0 ||
          SKIPPED.has(name) ||
          isHidden(attributes.style)
        ) {
          hiddenDepth++;
        } else if (name === "br") {
          text += "\n";
        }
      },
      ontext(data) {
        if (hiddenDepth === 0) text += data;
      },
      onclosetag(name) {
        if (hiddenDepth > 0) {
          hiddenDepth--;
        } else if (BLOCKS.has(name)) {
          text += "\n";
        } else if (CELLS.has(name)) {
          text += " ";
        }
      },
    },
    { decodeEntities: true },
  );
  parser.end(html);
  return text;
}
