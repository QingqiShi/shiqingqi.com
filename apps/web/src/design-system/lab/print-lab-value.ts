import type { CodeToken } from "@tuja/ui/components/code-block";
import { isValidElement } from "react";
import type { LabDefinition, LabImport, LabSourceCode } from "./types.ts";

/**
 * One line of a printed value. `depth` counts the indent steps past the
 * indent the value starts at, so the caller can put the line's whitespace in
 * a part's lead.
 */
export interface LabValueLine {
  depth: number;
  tokens: CodeToken[];
}

/** What a printed value needs beside its own lines. */
export interface LabValueNeeds {
  /** The bindings the nodes in the value need. */
  imports: LabImport[];
  /** The declarations of the Lab module that the nodes in the value use. */
  definitions: LabDefinition[];
}

interface PrintedLabValue extends LabValueNeeds {
  lines: LabValueLine[];
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

const sources = new WeakMap<object, LabSourceCode>();

/**
 * Gives a node inside a Variant's data, such as the icon of one option, the
 * source the snippet prints for it. A snippet cannot print a node without it.
 */
export function withSource<T extends object>(
  node: T,
  code: string,
  imports: readonly LabImport[] = [],
): T {
  sources.set(node, { tokens: sampleTokens(code), imports });
  return node;
}

/**
 * Gives a value the source the snippet prints for it, as the Lab module
 * writes it: a node of many lines, or a function such as a render prop. The
 * specimen-source Babel plugin reads the source and gives the second
 * argument. Do not write it.
 */
export function labSource<T>(value: T, source?: LabSourceCode): T {
  if (source === undefined) {
    throw new Error(
      "labSource() has no source. The specimen-source Babel plugin gives it.",
    );
  }
  if ((typeof value !== "object" && typeof value !== "function") || !value) {
    throw new Error("labSource() takes a node or a function.");
  }
  sources.set(value, source);
  return value;
}

/** The source `withSource` or `labSource` gave a value. */
function sourceOf(value: unknown): LabSourceCode | undefined {
  return (typeof value === "object" || typeof value === "function") && value
    ? sources.get(value)
    : undefined;
}

/**
 * A source's tokens split into lines. A line's indent becomes its depth, so
 * the caller can print it inside the element it belongs to.
 */
export function sourceLines(tokens: readonly CodeToken[]): LabValueLine[] {
  const rows: CodeToken[][] = [[]];
  for (const [kind, text] of tokens) {
    text.split("\n").forEach((piece, index) => {
      if (index > 0) rows.push([]);
      if (piece !== "") rows[rows.length - 1].push([kind, piece]);
    });
  }
  return rows.map((row) => {
    if (row.length === 0) return { depth: 0, tokens: [] };
    const [first, ...rest] = row;
    const indent = /^ */.exec(first[1])?.[0].length ?? 0;
    const head = first[1].slice(indent);
    return {
      depth: Math.floor(indent / INDENT),
      tokens: head === "" ? rest : [[first[0], head], ...rest],
    };
  });
}

/** Whether the lines are one JSX element or fragment. */
export function isJsxLines(lines: readonly LabValueLine[]) {
  const first = lines.at(0)?.tokens.at(0);
  return first?.[1].startsWith("<") === true;
}

function addNeeds(needs: LabValueNeeds, source: LabSourceCode) {
  needs.imports.push(...source.imports);
  needs.definitions.push(...(source.definitions ?? []));
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

function flatTokens(value: unknown, needs: LabValueNeeds): CodeToken[] {
  if (typeof value === "string") return [["string", JSON.stringify(value)]];
  if (typeof value === "number") return [["number", String(value)]];
  if (typeof value === "boolean" || value === null || value === undefined) {
    return [["keyword", String(value)]];
  }
  if (typeof value === "function" && sourceOf(value) === undefined) {
    return [
      ["punct", "()"],
      ["plain", " "],
      ["punct", "=>"],
      ["plain", " "],
      ["punct", "{}"],
    ];
  }

  const source = sourceOf(value);
  if (source !== undefined) {
    addNeeds(needs, source);
    return [...source.tokens];
  }
  if (isValidElement(value)) {
    throw new Error(
      "A Lab Variant holds a node with no source. Give it one with withSource() or labSource().",
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
        ...flatTokens(item, needs),
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
        ...flatTokens(entry, needs),
      ]),
      ["plain", " "],
      ["punct", "}"],
    ];
  }

  throw new Error(`A Lab snippet cannot print a ${typeof value}.`);
}

/**
 * A source of many lines inside an expression. Prettier puts JSX of many lines
 * in parentheses, and a function starts on the line its key is on.
 */
function sourceValueLines(lines: LabValueLine[]): LabValueLine[] {
  if (!isJsxLines(lines)) return lines;
  return [
    { depth: 0, tokens: [["punct", "("]] },
    ...lines.map((line) => ({ ...line, depth: line.depth + 1 })),
    { depth: 0, tokens: [["punct", ")"]] },
  ];
}

function printLines(
  value: unknown,
  layout: LabValueLayout,
  needs: LabValueNeeds,
): LabValueLine[] {
  const source = sourceOf(value);
  if (source !== undefined) {
    addNeeds(needs, source);
    const lines = sourceLines(source.tokens);
    return lines.length === 1 ? lines : sourceValueLines(lines);
  }

  const found: LabValueNeeds = { imports: [], definitions: [] };
  const flat = flatTokens(value, found);
  const fits =
    layout.column + lengthOf(flat) + layout.trailing <= layout.width &&
    !flat.some(([, text]) => text.includes("\n"));
  const items = Array.isArray(value)
    ? value.map((item: unknown) => ({ key: null, item }))
    : isRecord(value)
      ? entriesOf(value).map(([key, item]) => ({ key, item }))
      : null;

  if (items === null || items.length === 0 || (fits && !mustBreak(value))) {
    needs.imports.push(...found.imports);
    needs.definitions.push(...found.definitions);
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
      needs,
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
 * line. A function prints as an empty arrow function, unless it has a source.
 */
export function printLabValue(
  value: unknown,
  layout: LabValueLayout,
): PrintedLabValue {
  const needs: LabValueNeeds = { imports: [], definitions: [] };
  const lines = printLines(value, layout, needs);
  return { lines, ...needs };
}

export function textOf(tokens: readonly CodeToken[]): string {
  return tokens.map(([, text]) => text).join("");
}

export function noNeeds(): LabValueNeeds {
  return { imports: [], definitions: [] };
}

/** The lines of a node with a source, or `null` for a value with none. */
export function sourcedLines(
  value: unknown,
  needs: LabValueNeeds,
): LabValueLine[] | null {
  const source = sourceOf(value);
  if (source === undefined) return null;
  needs.imports.push(...source.imports);
  needs.definitions.push(...(source.definitions ?? []));
  return sourceLines(source.tokens);
}
