const MAX_LINE_OCTETS = 75;

/** One content line of an iCalendar object (RFC 5545 3.1), as it was written. */
export interface IcsProperty {
  name: string;
  params: Map<string, string>;
  value: string;
  /** The unfolded line. */
  line: string;
}

/** The content lines of an iCalendar object, unfolded, without empty lines. */
export function unfoldIcs(ics: string): string[] {
  return ics
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

export function parseIcsLine(line: string): IcsProperty | null {
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') inQuotes = !inQuotes;
    if (char === ":" && !inQuotes) {
      const [name, ...rawParams] = line.slice(0, index).split(";");
      const params = new Map(
        rawParams.map((param) => {
          const [key, value = ""] = param.split("=");
          return [key.toUpperCase(), value.replace(/^"|"$/g, "")];
        }),
      );
      return {
        name: name.toUpperCase(),
        params,
        value: line.slice(index + 1),
        line,
      };
    }
  }
  return null;
}

/** Escapes a TEXT value (RFC 5545 3.3.11). */
export function escapeIcsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

export function unescapeIcsText(value: string) {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) =>
    char === "n" || char === "N" ? "\n" : char,
  );
}

/** Folds a content line into lines of at most 75 octets, without splitting a character. */
function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = lines.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      lines.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  lines.push(current);
  return lines.map((part, index) => (index === 0 ? part : ` ${part}`));
}

/** Content lines as an iCalendar object: folded, with CRLF line ends. */
export function joinIcs(lines: readonly string[]) {
  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}
