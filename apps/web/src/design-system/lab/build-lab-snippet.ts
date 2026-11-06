import type { CodePart, CodeToken } from "@tuja/ui/components/code-block";
import {
  type LabValueLine,
  printLabValue,
  sampleTokens,
} from "./print-lab-value.ts";
import type {
  LabControlModel,
  LabImport,
  LabPropDoc,
  LabProps,
  LabSampleChoice,
} from "./types.ts";

export interface LabSnippet {
  parts: readonly CodePart[];
  /** The whole snippet as source text — what Copy writes. */
  text: string;
}

/** The state binding of a Lab, with its props named. */
export interface LabSnippetState {
  prop: string;
  handler: string;
  type?: { code: string; imports: readonly LabImport[] };
}

interface BuildLabSnippetOptions {
  /** The element name to print — `"Button"`. */
  element: string;
  importPath: string;
  props: LabProps;
  /** Every documented prop, for the default an attribute equal to it omits. */
  docs: readonly LabPropDoc[];
  /** The controls, in the order the panel lists them. */
  controls: readonly LabControlModel[];
  state?: LabSnippetState;
}

/** Past this the element takes one attribute per line, the way Prettier breaks it. */
const MAX_COLUMNS = 72;

/** The indent of an attribute on a line of its own. */
const ATTRIBUTE_INDENT = 2;

const EQUALS: readonly CodeToken[] = [["punct", "="]];

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const STRING_LITERAL = /^"[^"]*"$/;

function importTokens(
  bindings: readonly LabImport[],
  from: string,
): CodeToken[] {
  return [
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{"],
    ["plain", " "],
    ...bindings.flatMap(({ name, isType }, index): CodeToken[] => [
      ...(index === 0
        ? []
        : ([
            ["punct", ","],
            ["plain", " "],
          ] as const)),
      ...(isType === true
        ? ([
            ["keyword", "type"],
            ["plain", " "],
          ] as const)
        : []),
      [/^[A-Z]/.test(name) ? "component" : "plain", name],
    ]),
    ["plain", " "],
    ["punct", "}"],
    ["plain", " "],
    ["keyword", "from"],
    ["plain", " "],
    ["string", `"${from}"`],
    ["punct", ";"],
  ];
}

export function importLine(name: string, from: string): CodeToken[] {
  return importTokens([{ name, from }], from);
}

export function textOf(tokens: readonly CodeToken[]): string {
  return tokens.map(([, text]) => text).join("");
}

/** What one attribute prints after its name. */
type AttributeValue =
  /** A `true` flag, which prints its name alone. */
  | { kind: "flag" }
  | { kind: "tokens"; tokens: CodeToken[] }
  /** An array, an object or a function, printed in braces. */
  | { kind: "expression"; value: unknown };

/** The attribute's value, or `null` when the attribute is not printed at all. */
function attributeValue(
  value: unknown,
  control: LabControlModel | undefined,
  defaultValue: string | undefined,
): AttributeValue | null {
  if (value === undefined || value === null) return null;

  if (control?.samples !== undefined) {
    const sample = control.samples.find((choice) => choice.id === value);
    if (sample === undefined || sample.code === "") return null;
    if (STRING_LITERAL.test(sample.code)) {
      return { kind: "tokens", tokens: [["string", sample.code]] };
    }
    return {
      kind: "tokens",
      tokens: [["punct", "{"], ...sampleTokens(sample.code), ["punct", "}"]],
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

function bracedIdentifier(name: string): AttributeValue {
  return {
    kind: "tokens",
    tokens: [
      ["punct", "{"],
      ["plain", name],
      ["punct", "}"],
    ],
  };
}

/** The children as source: a sample's code, or the text the visitor typed. */
function childrenTokens(
  value: unknown,
  sample: LabSampleChoice | undefined,
): CodeToken[] {
  if (sample !== undefined) {
    return sample.code === "" ? [] : sampleTokens(sample.code);
  }
  return typeof value === "string" && value !== "" ? [["plain", value]] : [];
}

interface PrintedAttribute {
  prop: string;
  /** Empty for a flag. */
  lines: LabValueLine[];
  imports: LabImport[];
}

function printAttribute(
  prop: string,
  value: AttributeValue,
  indent: number,
  width: number,
): PrintedAttribute {
  if (value.kind === "flag") return { prop, lines: [], imports: [] };
  if (value.kind === "tokens") {
    return { prop, lines: [{ depth: 0, tokens: value.tokens }], imports: [] };
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
  return { prop, lines, imports: printed.imports };
}

/**
 * The parts of one value, a part to a line, because a part must not hold a
 * line break. A line's id carries its text, so a changed line plays as the old
 * part leaving and the new one arriving.
 */
function lineParts(
  id: string,
  lines: readonly LabValueLine[],
  indent: number,
): CodePart[] {
  const seen = new Map<string, number>();
  return lines.map((line, index) => {
    const text = textOf(line.tokens);
    const count = seen.get(text) ?? 0;
    seen.set(text, count + 1);
    return {
      id: `${id}:${text}${count === 0 ? "" : `#${String(count)}`}`,
      lead:
        index === 0
          ? ""
          : `\n${" ".repeat(indent + ATTRIBUTE_INDENT * line.depth)}`,
      tokens: line.tokens,
    };
  });
}

function setterOf(name: string) {
  return `set${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** A default as the docs print it, `'"md"'`, back as the value it stands for. */
function parseDefault(source: string | undefined): unknown {
  if (source === undefined) return undefined;
  try {
    return JSON.parse(source) as unknown;
  } catch {
    return undefined;
  }
}

/** The `useState` line of a Lab with a state binding. */
function stateParts(
  state: LabSnippetState,
  name: string,
  initial: unknown,
): { parts: CodePart[]; imports: LabImport[] } {
  // An empty array makes TypeScript infer `never[]`, so it needs its type.
  const typeArgument =
    state.type?.code ??
    (Array.isArray(initial) && initial.length === 0 ? "string[]" : undefined);
  const head: CodeToken[] = [
    ["keyword", "const"],
    ["plain", " "],
    ["punct", "["],
    ["plain", name],
    ["punct", ","],
    ["plain", " "],
    ["plain", setterOf(name)],
    ["punct", "]"],
    ["plain", " "],
    ["punct", "="],
    ["plain", " "],
    ["plain", "useState"],
    ...(typeArgument === undefined
      ? []
      : ([
          ["punct", "<"],
          ["component", typeArgument],
          ["punct", ">"],
        ] as const)),
    ["punct", "("],
  ];
  const close: CodeToken[] = [
    ["punct", ")"],
    ["punct", ";"],
  ];
  const printed: { lines: LabValueLine[]; imports: LabImport[] } =
    initial === undefined
      ? { lines: [{ depth: 0, tokens: [] }], imports: [] }
      : printLabValue(initial, {
          indent: 0,
          column: textOf(head).length,
          trailing: textOf(close).length,
          width: MAX_COLUMNS,
        });
  const lines = printed.lines.map((line) => ({ ...line }));
  const last = lines.at(-1);
  if (last !== undefined) last.tokens = [...last.tokens, ...close];
  return {
    parts: [
      { id: "state", lead: "\n\n", tokens: head },
      ...lineParts("state", lines, 0),
    ],
    imports: [
      ...(state.type?.imports ?? []),
      ...printed.imports,
      { name: "useState", from: "react" },
    ],
  };
}

/**
 * The snippet for what is on the Canvas, built from the Lab's state rather
 * than parsed: every run is emitted with the kind it is, so the snippet needs
 * no tokeniser at runtime. A prop equal to its default is omitted, because the
 * snippet is what a consumer would write, not a dump of the state.
 */
export function buildLabSnippet({
  element,
  importPath,
  props,
  docs,
  controls,
  state,
}: BuildLabSnippetOptions): LabSnippet {
  const controlByName = new Map(
    controls.map((control) => [control.name, control]),
  );
  const defaultByName = new Map(
    docs.flatMap((doc) =>
      doc.defaultValue === undefined ? [] : [[doc.name, doc.defaultValue]],
    ),
  );
  const stateName =
    state === undefined
      ? undefined
      : IDENTIFIER.test(state.prop)
        ? state.prop
        : "value";

  // Controls first, in the order the panel lists them, then any prop a Variant
  // sets without offering a control for it — an icon-only Button's aria-label.
  const order = [
    ...new Set([
      ...controls.map((control) => control.name),
      ...Object.keys(props),
      ...(state === undefined ? [] : [state.prop]),
    ]),
  ];

  const values = order.flatMap(
    (prop): { prop: string; value: AttributeValue }[] => {
      if (prop === "children" || prop === state?.handler) return [];
      if (
        state !== undefined &&
        stateName !== undefined &&
        prop === state.prop
      ) {
        return [
          { prop, value: bracedIdentifier(stateName) },
          { prop: state.handler, value: bracedIdentifier(setterOf(stateName)) },
        ];
      }
      const value = attributeValue(
        props[prop],
        controlByName.get(prop),
        defaultByName.get(prop),
      );
      return value === null ? [] : [{ prop, value }];
    },
  );

  const sampleOf = (prop: string) =>
    controlByName
      .get(prop)
      ?.samples?.find((choice) => choice.id === props[prop]);
  const childrenSample = sampleOf("children");
  const usedSamples = [...values.map(({ prop }) => prop), "children"].flatMap(
    (prop) => {
      const sample = sampleOf(prop);
      return sample === undefined ? [] : [sample];
    },
  );

  const childTokens = childrenTokens(props.children, childrenSample);
  const children = textOf(childTokens);
  const open: CodeToken[] = [
    ["punct", "<"],
    ["component", element],
  ];

  const inline = values.map(({ prop, value }) =>
    printAttribute(prop, value, 0, Number.POSITIVE_INFINITY),
  );
  const inlineLength =
    textOf(open).length +
    inline.reduce(
      (total, { prop, lines }) =>
        total +
        ` ${prop}`.length +
        (lines.length > 0 ? 1 : 0) +
        lines.reduce((sum, line) => sum + textOf(line.tokens).length, 0),
      0,
    ) +
    (children === "" ? " />".length : `>${children}</${element}>`.length);
  const multiline =
    inlineLength > MAX_COLUMNS || inline.some(({ lines }) => lines.length > 1);
  const attributes = multiline
    ? values.map(({ prop, value }) =>
        printAttribute(prop, value, ATTRIBUTE_INDENT, MAX_COLUMNS),
      )
    : inline;

  // A value is a part of its own, right after its attribute's name part, so a
  // changed value plays as the old part leaving and the new one arriving.
  const attributeParts: CodePart[] = attributes.flatMap(({ prop, lines }) => {
    const name: CodePart = {
      id: `attr-${prop}`,
      lead: multiline ? `\n${" ".repeat(ATTRIBUTE_INDENT)}` : " ",
      tokens: [["attr", prop], ...(lines.length > 0 ? EQUALS : [])],
    };
    return [name, ...lineParts(name.id, lines, ATTRIBUTE_INDENT)];
  });

  const close: CodePart[] =
    children === ""
      ? [
          {
            id: "close",
            lead: multiline ? "\n" : " ",
            tokens: [["punct", "/>"]],
          },
        ]
      : [
          {
            id: "close",
            lead: multiline ? "\n" : "",
            tokens: [["punct", ">"]],
          },
          {
            id: "children",
            lead: multiline ? `\n${" ".repeat(ATTRIBUTE_INDENT)}` : "",
            tokens: childTokens,
          },
          {
            id: "end",
            lead: multiline ? "\n" : "",
            tokens: [
              ["punct", "</"],
              ["component", element],
              ["punct", ">"],
            ],
          },
        ];

  const statement =
    state === undefined || stateName === undefined
      ? { parts: [], imports: [] }
      : stateParts(
          state,
          stateName,
          props[state.prop] ?? parseDefault(defaultByName.get(state.prop)),
        );

  const bindings: LabImport[] = [
    { name: element, from: importPath },
    ...usedSamples.flatMap((sample) => sample.imports),
    ...attributes.flatMap((attribute) => attribute.imports),
    ...statement.imports,
  ];
  const modules = new Map<string, LabImport[]>();
  for (const binding of bindings) {
    const names = modules.get(binding.from) ?? [];
    if (!names.some(({ name }) => name === binding.name)) names.push(binding);
    modules.set(binding.from, names);
  }
  const imports: CodePart[] = [...modules].map(([from, names], index) => ({
    id: `import-${from}`,
    lead: index === 0 ? "" : "\n",
    tokens: importTokens(names, from),
  }));

  const parts: CodePart[] = [
    ...imports,
    ...statement.parts,
    { id: "open", lead: "\n\n", tokens: open },
    ...attributeParts,
    ...close,
  ];

  const text = parts.map((part) => part.lead + textOf(part.tokens)).join("");

  return { parts, text };
}
