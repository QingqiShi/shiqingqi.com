export interface NotePart {
  text: string;
  /** Set when the part is a web address. */
  href?: string;
}

const LINK = /https?:\/\/[\w\-.~:/?#[\]@!$&'()*+,;=%]+/g;
const TRAILING = ".,;:!?'\")]";

function count(text: string, char: string) {
  return text.split(char).length - 1;
}

/** A web address without the punctuation of the sentence after it, but with a closing bracket that it opened. */
function trimLink(link: string) {
  let end = link.length;
  while (end > 0 && TRAILING.includes(link[end - 1])) {
    const kept = link.slice(0, end);
    if (link[end - 1] === ")" && count(kept, "(") >= count(kept, ")")) break;
    end -= 1;
  }
  return link.slice(0, end);
}

/** The text of a note in parts, where each web address that starts with http or https is a part of its own. */
export function splitLinks(text: string): NotePart[] {
  const parts: NotePart[] = [];
  let from = 0;
  for (const match of text.matchAll(LINK)) {
    const link = trimLink(match[0]);
    if (link.endsWith("://")) continue;
    if (match.index > from) parts.push({ text: text.slice(from, match.index) });
    parts.push({ text: link, href: link });
    from = match.index + link.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from) });
  return parts;
}
