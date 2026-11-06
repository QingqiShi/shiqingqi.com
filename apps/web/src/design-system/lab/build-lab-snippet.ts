import type { CodePart, CodeToken } from "@tuja/ui/components/code-block";
import { importParts } from "./import-parts.ts";
import {
  type AttributeValue,
  attributeValue,
  bracedIdentifier,
  bracedSetterCall,
  printAttribute,
} from "./print-attribute.ts";
import {
  type LabValueLine,
  type LabValueNeeds,
  noNeeds,
  printLabValue,
  sampleTokens,
  sourceLines,
  sourcedLines,
  textOf,
} from "./print-lab-value.ts";
import type {
  LabControlModel,
  LabDefinition,
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
  /** The value every call of the handler stands for, when it passes none. */
  nextValue?: string | number | boolean;
  /** A node with a source, printed before the element in a fragment. */
  trigger?: unknown;
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

/** One indent step, as Prettier prints it. */
const INDENT = 2;

const EQUALS: readonly CodeToken[] = [["punct", "="]];

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const FRAGMENT_OPEN: CodePart = {
  id: "fragment-open",
  lead: "\n\n",
  tokens: [["punct", "<>"]],
};

const FRAGMENT_CLOSE: CodePart = {
  id: "fragment-close",
  lead: "\n",
  tokens: [["punct", "</>"]],
};

/**
 * The children as lines: a sample's code, a node's source, or the text the
 * visitor typed. A fragment's own tags go, as the element holds its children.
 */
function childrenLines(
  value: unknown,
  sample: LabSampleChoice | undefined,
  needs: LabValueNeeds,
): LabValueLine[] {
  if (sample?.code !== undefined) {
    needs.imports.push(...(sample.imports ?? []));
    return sample.code === ""
      ? []
      : [{ depth: 0, tokens: sampleTokens(sample.code) }];
  }
  const lines = sourcedLines(
    sample === undefined ? value : sample.value,
    needs,
  );
  if (lines !== null) {
    const first = lines.at(0);
    const last = lines.at(-1);
    const isFragment =
      lines.length > 2 &&
      first !== undefined &&
      last !== undefined &&
      textOf(first.tokens) === "<>" &&
      textOf(last.tokens) === "</>";
    return isFragment
      ? lines.slice(1, -1).map((line) => ({ ...line, depth: line.depth - 1 }))
      : lines;
  }
  return typeof value === "string" && value !== ""
    ? [{ depth: 0, tokens: [["plain", value]] }]
    : [];
}

/** A line's id carries its text, so a changed line plays as the old part leaving and the new one arriving. */
function lineIds(id: string, lines: readonly LabValueLine[]) {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const text = textOf(line.tokens);
    const count = seen.get(text) ?? 0;
    seen.set(text, count + 1);
    return `${id}:${text}${count === 0 ? "" : `#${String(count)}`}`;
  });
}

function indentOf(indent: number, line: LabValueLine) {
  return " ".repeat(indent + INDENT * line.depth);
}

/**
 * The parts of one value that starts on a line already begun, a part to a
 * line, because a part must not hold a line break.
 */
function lineParts(
  id: string,
  lines: readonly LabValueLine[],
  indent: number,
): CodePart[] {
  const ids = lineIds(id, lines);
  return lines.map((line, index) => ({
    id: ids[index],
    lead: index === 0 ? "" : `\n${indentOf(indent, line)}`,
    tokens: line.tokens,
  }));
}

/** The parts of lines that each start a line of their own. */
function blockParts(
  id: string,
  lines: readonly LabValueLine[],
  indent: number,
  firstLead = "\n",
): CodePart[] {
  const ids = lineIds(id, lines);
  return lines.map((line, index) => ({
    id: ids[index],
    lead: `${index === 0 ? firstLead : "\n"}${indentOf(indent, line)}`,
    tokens: line.tokens,
  }));
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

function lineLength(lines: readonly LabValueLine[]) {
  return lines.reduce((sum, line) => sum + textOf(line.tokens).length, 0);
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
        const setter = setterOf(stateName);
        return [
          { prop, value: bracedIdentifier(stateName) },
          {
            prop: state.handler,
            value:
              state.nextValue === undefined
                ? bracedIdentifier(setter)
                : bracedSetterCall(setter, state.nextValue),
          },
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

  const childrenSample = controlByName
    .get("children")
    ?.samples?.find((choice) => choice.id === props.children);
  const childNeeds = noNeeds();
  const childLines = childrenLines(props.children, childrenSample, childNeeds);

  const triggerNeeds = noNeeds();
  const triggerLines =
    state?.trigger === undefined
      ? null
      : sourcedLines(state.trigger, triggerNeeds);
  // A trigger stands beside the element, so the two go in a fragment.
  const base = triggerLines === null ? 0 : INDENT;

  const open: CodeToken[] = [
    ["punct", "<"],
    ["component", element],
  ];
  const end: CodeToken[] = [
    ["punct", "</"],
    ["component", element],
    ["punct", ">"],
  ];

  const inline = values.map(({ prop, value }) =>
    printAttribute(prop, value, base, Number.POSITIVE_INFINITY),
  );
  const openLength =
    base +
    textOf(open).length +
    inline.reduce(
      (total, { prop, lines }) =>
        total +
        ` ${prop}`.length +
        (lines.length > 0 ? 1 : 0) +
        lineLength(lines),
      0,
    ) +
    (childLines.length === 0 ? " />".length : ">".length);
  const hasBrokenValue = inline.some(({ lines }) => lines.length > 1);
  const fitsOneLine =
    !hasBrokenValue &&
    childLines.length <= 1 &&
    openLength +
      lineLength(childLines) +
      (childLines.length === 0 ? 0 : textOf(end).length) <=
      MAX_COLUMNS;
  // Prettier breaks the attributes only when the opening tag cannot hold them,
  // and puts children of their own lines below it.
  const breaksAttributes =
    !fitsOneLine &&
    (hasBrokenValue || childLines.length === 0 || openLength > MAX_COLUMNS);
  const attributes = breaksAttributes
    ? values.map(({ prop, value }) =>
        printAttribute(prop, value, base + INDENT, MAX_COLUMNS),
      )
    : inline;

  // A value is a part of its own, right after its attribute's name part, so a
  // changed value plays as the old part leaving and the new one arriving.
  const attributeIndent = breaksAttributes ? base + INDENT : base;
  const attributeParts: CodePart[] = attributes.flatMap(({ prop, lines }) => {
    const name: CodePart = {
      id: `attr-${prop}`,
      lead: breaksAttributes ? `\n${" ".repeat(attributeIndent)}` : " ",
      tokens: [["attr", prop], ...(lines.length > 0 ? EQUALS : [])],
    };
    return [name, ...lineParts(name.id, lines, attributeIndent)];
  });

  const close: CodePart[] =
    childLines.length === 0
      ? [
          {
            id: "close",
            lead: breaksAttributes ? `\n${" ".repeat(base)}` : " ",
            tokens: [["punct", "/>"]],
          },
        ]
      : [
          {
            id: "close",
            lead: breaksAttributes ? `\n${" ".repeat(base)}` : "",
            tokens: [["punct", ">"]],
          },
          ...(fitsOneLine
            ? lineParts("children", childLines, base)
            : blockParts("children", childLines, base + INDENT)),
          {
            id: "end",
            lead: fitsOneLine ? "" : `\n${" ".repeat(base)}`,
            tokens: end,
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
    ...triggerNeeds.imports,
    ...attributes.flatMap((attribute) => attribute.imports),
    ...childNeeds.imports,
    ...statement.imports,
  ];
  const imports = importParts(bindings);

  const definitions = new Map<string, LabDefinition>();
  for (const definition of [
    ...triggerNeeds.definitions,
    ...attributes.flatMap((attribute) => attribute.definitions),
    ...childNeeds.definitions,
  ]) {
    definitions.set(definition.name, definition);
  }
  const definitionParts = [...definitions.values()].flatMap((definition) =>
    blockParts(
      `definition-${definition.name}`,
      sourceLines(definition.tokens),
      0,
      "\n\n",
    ),
  );

  const elementParts: CodePart[] = [
    {
      id: "open",
      lead: base === 0 ? "\n\n" : `\n${" ".repeat(base)}`,
      tokens: open,
    },
    ...attributeParts,
    ...close,
  ];

  // The element runs where the snippet puts it, so the styles it reads come
  // before it.
  const parts: CodePart[] = [
    ...imports,
    ...definitionParts,
    ...statement.parts,
    ...(triggerLines === null
      ? elementParts
      : [
          FRAGMENT_OPEN,
          ...blockParts("trigger", triggerLines, base),
          ...elementParts,
          FRAGMENT_CLOSE,
        ]),
  ];

  const text = parts.map((part) => part.lead + textOf(part.tokens)).join("");

  return { parts, text };
}
