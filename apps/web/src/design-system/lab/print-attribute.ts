import type { CodeToken } from "@tuja/ui/components/code-block";
import {
  isJsxLines,
  type LabValueLine,
  type LabValueNeeds,
  noNeeds,
  printLabValue,
  sampleTokens,
  sourcedLines,
} from "./print-lab-value.ts";
import type { LabControlModel, LabImport } from "./types.ts";

const STRING_LITERAL = /^"[^"]*"$/;

/** What one attribute prints after its name. */
export type AttributeValue =
  /** A `true` flag, which prints its name alone. */
  | { kind: "flag" }
  | { kind: "tokens"; tokens: CodeToken[]; imports?: readonly LabImport[] }
  /** An array, an object, a function or a node with a source, printed in braces. */
  | { kind: "expression"; value: unknown };

/** The attribute's value, or `null` when the attribute is not printed at all. */
export function attributeValue(
  value: unknown,
  control: LabControlModel | undefined,
  defaultValue: string | undefined,
): AttributeValue | null {
  if (value === undefined) return null;
  // A prop that takes `null` on purpose, such as `linkStatus`, must print
  // it, also when `null` is the default. The props type can need it.
  if (value === null) {
    return {
      kind: "tokens",
      tokens: [
        ["punct", "{"],
        ["keyword", "null"],
        ["punct", "}"],
      ],
    };
  }

  if (control?.samples !== undefined) {
    const sample = control.samples.find((choice) => choice.id === value);
    if (sample === undefined) return null;
    if (sample.code === undefined) {
      return sample.value === undefined
        ? null
        : { kind: "expression", value: sample.value };
    }
    if (sample.code === "") return null;
    if (STRING_LITERAL.test(sample.code)) {
      return { kind: "tokens", tokens: [["string", sample.code]] };
    }
    return {
      kind: "tokens",
      tokens: [["punct", "{"], ...sampleTokens(sample.code), ["punct", "}"]],
      imports: sample.imports,
    };
  }

  if (typeof value === "boolean") {
    if (value) return { kind: "flag" };
    return defaultValue === "true"
      ? {
          kind: "tokens",
          tokens: [
            ["punct", "{"],
            ["keyword", "false"],
            ["punct", "}"],
          ],
        }
      : null;
  }

  if (typeof value === "number") {
    if (String(value) === defaultValue) return null;
    return {
      kind: "tokens",
      tokens: [
        ["punct", "{"],
        ["number", String(value)],
        ["punct", "}"],
      ],
    };
  }

  if (typeof value === "object" || typeof value === "function") {
    return { kind: "expression", value };
  }

  if (typeof value !== "string" || value === "") return null;
  const printed = `"${value}"`;
  return printed === defaultValue
    ? null
    : { kind: "tokens", tokens: [["string", printed]] };
}

export function bracedIdentifier(name: string): AttributeValue {
  return {
    kind: "tokens",
    tokens: [
      ["punct", "{"],
      ["plain", name],
      ["punct", "}"],
    ],
  };
}

/** `{() => setIsOpen(false)}`: a handler that passes no value sets this one. */
export function bracedSetterCall(
  setter: string,
  next: string | number | boolean,
): AttributeValue {
  const value = printLabValue(next, {
    indent: 0,
    column: 0,
    trailing: 0,
    width: Number.POSITIVE_INFINITY,
  }).lines.flatMap((line) => line.tokens);
  return {
    kind: "tokens",
    tokens: [
      ["punct", "{"],
      ["punct", "()"],
      ["plain", " "],
      ["punct", "=>"],
      ["plain", " "],
      ["plain", setter],
      ["punct", "("],
      ...value,
      ["punct", ")"],
      ["punct", "}"],
    ],
  };
}

interface PrintedAttribute extends LabValueNeeds {
  prop: string;
  /** Empty for a flag. */
  lines: LabValueLine[];
}

/**
 * A source of many lines as an attribute's value. Prettier puts JSX on lines
 * of its own between the braces, and starts a function after the `{`.
 */
function bracedSourceLines(lines: LabValueLine[]): LabValueLine[] {
  if (isJsxLines(lines)) {
    return [
      { depth: 0, tokens: [["punct", "{"]] },
      ...lines.map((line) => ({ ...line, depth: line.depth + 1 })),
      { depth: 0, tokens: [["punct", "}"]] },
    ];
  }
  return lines.map((line, index) => ({
    ...line,
    tokens: [
      ...(index === 0 ? ([["punct", "{"]] as const) : []),
      ...line.tokens,
      ...(index === lines.length - 1 ? ([["punct", "}"]] as const) : []),
    ],
  }));
}

export function printAttribute(
  prop: string,
  value: AttributeValue,
  indent: number,
  width: number,
): PrintedAttribute {
  if (value.kind === "flag") return { prop, lines: [], ...noNeeds() };
  if (value.kind === "tokens") {
    return {
      prop,
      lines: [{ depth: 0, tokens: value.tokens }],
      imports: [...(value.imports ?? [])],
      definitions: [],
    };
  }
  const needs = noNeeds();
  const sourced = sourcedLines(value.value, needs);
  if (sourced !== null && sourced.length > 1) {
    return { prop, lines: bracedSourceLines(sourced), ...needs };
  }
  const printed = printLabValue(value.value, {
    indent,
    column: indent + `${prop}={`.length,
    trailing: "}".length,
    width,
  });
  const lines = printed.lines.map((line) => ({ ...line }));
  const first = lines.at(0);
  const last = lines.at(-1);
  if (first !== undefined && last !== undefined) {
    first.tokens = [["punct", "{"], ...first.tokens];
    last.tokens = [...last.tokens, ["punct", "}"]];
  }
  return {
    prop,
    lines,
    imports: printed.imports,
    definitions: printed.definitions,
  };
}
