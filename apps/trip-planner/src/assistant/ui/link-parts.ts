export type TextPart =
  { kind: "text"; text: string } | { kind: "link"; text: string; url: string };

/** A Markdown link, or a bare web address. */
const LINKISH =
  /\[(?<label>[^\]\n]{1,200})\]\((?<target>https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>()"'`]+/g;
const TRAILING = /[.,;:!?'"。，；：！？」』]+$/u;
const SCHEME = /[a-z][a-z0-9+.-]*:\/\//i;
const HOST = /(?:[\p{L}\p{N}-]+[.。．｡])+\p{L}{2,}/u;

function plainHost(host: string): string {
  return host
    .normalize("NFKC")
    .toLowerCase()
    .replace(/。/g, ".")
    .replace(/^www\./, "");
}

/** The label of a link, or the link's own host when the label names another site. */
function shownLabel(label: string, url: string): string {
  const named = HOST.exec(label)?.[0];
  if (named === undefined && !SCHEME.test(label)) return label;
  const host = URL.canParse(url) ? new URL(url).hostname : url;
  return named !== undefined && plainHost(named) === plainHost(host)
    ? label
    : host;
}

/**
 * Splits the assistant's text into plain runs and links. Only a web address
 * in `allowed`, the server's research lists, becomes a link; any other
 * stays plain text as written, so that the model cannot make a link up.
 */
export function linkParts(
  text: string,
  allowed: ReadonlySet<string>,
): TextPart[] {
  const parts: TextPart[] = [];
  let plain = "";
  let at = 0;
  for (const match of text.matchAll(LINKISH)) {
    const label = match.groups?.label;
    let url = match.groups?.target ?? match[0];
    let whole = match[0];
    if (label === undefined) {
      url = url.replace(TRAILING, "");
      whole = url;
    }
    plain += text.slice(at, match.index);
    at = match.index + whole.length;
    if (allowed.has(url)) {
      if (plain !== "") parts.push({ kind: "text", text: plain });
      plain = "";
      parts.push({
        kind: "link",
        text: label === undefined ? url : shownLabel(label, url),
        url,
      });
    } else {
      plain += whole;
    }
  }
  plain += text.slice(at);
  if (plain !== "") parts.push({ kind: "text", text: plain });
  return parts;
}
