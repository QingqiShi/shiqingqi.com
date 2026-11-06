import type { CodeToken } from "@tuja/ui/components/code-block";
import { isValidElement } from "react";
import type { LabImport } from "./types.ts";

/**
 * One line of a printed value. `depth` counts the indent steps past the
 * indent the value starts at, so the caller can put the line's whitespace in
 * a part's lead.
 */
export interface LabValueLine {
  depth: number;
  tokens: CodeToken[];
}

export interface PrintedLabValue {
  lines: LabValueLine[];
  /** The bindings the nodes in the value need. */
  imports: LabImport[];
}

interface LabValueLayout {
  /** The indent of the line the value starts on. */
  indent: number;
  /** The column the value's first character takes. */
  column: number;
  /** The characters that follow the value on its last line, such as `}`. */
  trailing: number;
  /** The column no line may pass. */
  width: number;
}

/** One indent step, as Prettier prints it. */
const INDENT = 2;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const SELF_CLOSING_ELEMENT = /^<([A-Z][A-Za-z0-9]*)((?: [\w-]+="[^"]*")*) \/>$/;

const STRING_ATTRIBUTE = / ([\w-]+)=("[^"]*")/g;

const sources = new WeakMap<
  object,
  { code: string; imports: readonly LabImport[] }
>();

/**
 * Gives a node inside a Variant's data, such as the icon of one option, the
 * source the snippet prints for it. A snippet cannot print a node without it.
 */
export function withSource<T extends object>(
  node: T,
  code: string,
  imports: readonly LabImport[] = [],
): T {
  sources.set(node, { code, imports });
  return node;
}

/** The tokens of a sample's code: an element with string attributes, or else plain text. */
export function sampleTokens(code: string): CodeToken[] {
  const match = SELF_CLOSING_ELEMENT.exec(code);
  if (match === null) return [["plain", code]];
  return [
    ["punct", "<"],
    ["component", match[1]],
    ...[...match[2].matchAll(STRING_ATTRIBUTE)].flatMap(
      ([, name, value]): CodeToken[] => [
        ["plain", " "],
        ["attr", name],
        ["punct", "="],
        ["string", value],
      ],
    ),
    ["plain", " "],
    ["punct", "/>"],
  ];
}

function lengthOf(tokens: readonly CodeToken[]) {
  return tokens.reduce((total, [, text]) => total + text.length, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entriesOf(value: Record<string, unknown>) {
  return Object.entries(value).filter(([, entry]) => entry !== undefined);
}

function keyTokens(key: string): CodeToken[] {
  return [
    IDENTIFIER.test(key) ? ["property", key] : ["string", JSON.stringify(key)],
    ["punct", ":"],
    ["plain", " "],
  ];
}

/**
 * Prettier breaks an array of two or more objects that each have two or more
 * properties, even when it fits on one line.
 */
function mustBreak(value: unknown) {
  return (
    Array.isArray(value) &&
    value.length > 1 &&
    value.every((item) => isRecord(item) && entriesOf(item).length > 1)
  );
}

function flatTokens(value: unknown, imports: LabImport[]): CodeToken[] {
  if (typeof value === "string") return [["string", JSON.stringify(value)]];
  if (typeof value === "number") return [["number", String(value)]];
  if (typeof value === "boolean" || value === null || value === undefined) {
    return [["keyword", String(value)]];
  }
  if (typeof value === "function") {
    return [
      ["punct", "()"],
      ["plain", " "],
      ["punct", "=>"],
      ["plain", " "],
      ["punct", "{}"],
    ];
  }

  const source = typeof value === "object" ? sources.get(value) : undefined;
  if (source !== undefined) {
    imports.push(...source.imports);
    return sampleTokens(source.code);
  }
  if (isValidElement(value)) {
    throw new Error(
      "A Lab Variant holds a node with no source. Give it one with withSource().",
    );
  }

  if (Array.isArray(value)) {
    return [
      ["punct", "["],
      ...value.flatMap((item: unknown, index) => [
        ...(index === 0
          ? []
          : ([
              ["punct", ","],
              ["plain", " "],
            ] as const)),
        ...flatTokens(item, imports),
      ]),
      ["punct", "]"],
    ];
  }

  if (isRecord(value)) {
    const entries = entriesOf(value);
    if (entries.length === 0) return [["punct", "{}"]];
    return [
      ["punct", "{"],
      ["plain", " "],
      ...entries.flatMap(([key, entry], index) => [
        ...(index === 0
          ? []
          : ([
              ["punct", ","],
              ["plain", " "],
            ] as const)),
        ...keyTokens(key),
        ...flatTokens(entry, imports),
      ]),
      ["plain", " "],
      ["punct", "}"],
    ];
  }

  throw new Error(`A Lab snippet cannot print a ${typeof value}.`);
}

function printLines(
  value: unknown,
  layout: LabValueLayout,
  imports: LabImport[],
): LabValueLine[] {
  const found: LabImport[] = [];
  const flat = flatTokens(value, found);
  const fits = layout.column + lengthOf(flat) + layout.trailing <= layout.width;
  const items = Array.isArray(value)
    ? value.map((item: unknown) => ({ key: null, item }))
    : isRecord(value) && sources.get(value) === undefined
      ? entriesOf(value).map(([key, item]) => ({ key, item }))
      : null;

  if (items === null || items.length === 0 || (fits && !mustBreak(value))) {
    imports.push(...found);
    return [{ depth: 0, tokens: flat }];
  }

  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  const inner = layout.indent + INDENT;
  const lines: LabValueLine[] = [{ depth: 0, tokens: [["punct", open]] }];
  for (const { key, item } of items) {
    const lead = key === null ? [] : keyTokens(key);
    const itemLines = printLines(
      item,
      {
        indent: inner,
        column: inner + lengthOf(lead),
        trailing: 1,
        width: layout.width,
      },
      imports,
    );
    const first = itemLines.at(0);
    const last = itemLines.at(-1);
    if (first === undefined || last === undefined) continue;
    first.tokens = [...lead, ...first.tokens];
    last.tokens = [...last.tokens, ["punct", ","]];
    lines.push(
      ...itemLines.map((line) => ({ ...line, depth: line.depth + 1 })),
    );
  }
  lines.push({ depth: 0, tokens: [["punct", close]] });
  return lines;
}

/**
 * Prints a value as the source of a JavaScript expression, the way Prettier
 * would: on one line when it fits the width, else one item or property to a
 * line. A function prints as an empty arrow function.
 */
export function printLabValue(
  value: unknown,
  layout: LabValueLayout,
): PrintedLabValue {
  const imports: LabImport[] = [];
  const lines = printLines(value, layout, imports);
  return { lines, imports };
}
