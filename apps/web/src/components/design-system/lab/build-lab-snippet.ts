import type { CodeToken } from "../code/types.ts";
import type { LabControlModel, LabPropDoc, LabProps } from "./types.ts";

/**
 * One run of the snippet, on one line, that the card draws as a box of its
 * own: it morphs where it stands, rises in when it arrives, and fades when it
 * leaves.
 */
export interface LabSnippetPart {
  /** What the part is, stable across states: its key and transition name. */
  id: string;
  /**
   * The whitespace before it. It stays outside the box, because a box that
   * holds a line break cannot carry a transition name.
   */
  lead: string;
  tokens: readonly CodeToken[];
  /**
   * An attribute's value, a box of its own beside the name, so that a new
   * value can arrive as the old one leaves. Empty for a bare boolean attribute.
   */
  value?: readonly CodeToken[];
}

export interface LabSnippet {
  parts: readonly LabSnippetPart[];
  /** The whole snippet as source text — what Copy writes. */
  text: string;
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
}

/** Past this the element takes one attribute per line, the way Prettier breaks it. */
const MAX_COLUMNS = 72;

const SELF_CLOSING_ELEMENT = /^<([A-Z][A-Za-z0-9]*)\s*\/>$/;

const EQUALS: readonly CodeToken[] = [["punct", "="]];

function sampleTokens(code: string): CodeToken[] {
  const match = SELF_CLOSING_ELEMENT.exec(code);
  if (match === null) return [["plain", code]];
  return [
    ["punct", "<"],
    ["component", match[1]],
    ["plain", " "],
    ["punct", "/>"],
  ];
}

function importLine(name: string, from: string): CodeToken[] {
  return [
    ["keyword", "import"],
    ["plain", " "],
    ["punct", "{"],
    ["plain", " "],
    ["component", name],
    ["plain", " "],
    ["punct", "}"],
    ["plain", " "],
    ["keyword", "from"],
    ["plain", " "],
    ["string", `"${from}"`],
    ["punct", ";"],
  ];
}

export function textOf(tokens: readonly CodeToken[]): string {
  return tokens.map(([, text]) => text).join("");
}

/** The value tokens, or `null` when the attribute is not printed at all. */
function valueTokens(
  value: unknown,
  control: LabControlModel | undefined,
  defaultValue: string | undefined,
): CodeToken[] | null {
  if (value === undefined || value === null) return null;

  if (control?.samples !== undefined) {
    const sample = control.samples.find((choice) => choice.id === value);
    if (sample === undefined || sample.code === "") return null;
    return [["punct", "{"], ...sampleTokens(sample.code), ["punct", "}"]];
  }

  if (typeof value === "boolean") {
    if (value) return [];
    return defaultValue === "true"
      ? [
          ["punct", "{"],
          ["keyword", "false"],
          ["punct", "}"],
        ]
      : null;
  }

  if (typeof value === "number") {
    if (String(value) === defaultValue) return null;
    return [
      ["punct", "{"],
      ["number", String(value)],
      ["punct", "}"],
    ];
  }

  if (typeof value !== "string" || value === "") return null;
  const printed = `"${value}"`;
  return printed === defaultValue ? null : [["string", printed]];
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
}: BuildLabSnippetOptions): LabSnippet {
  const controlByName = new Map(
    controls.map((control) => [control.name, control]),
  );
  const defaultByName = new Map(
    docs.flatMap((doc) =>
      doc.defaultValue === undefined ? [] : [[doc.name, doc.defaultValue]],
    ),
  );

  // Controls first, in the order the panel lists them, then any prop a Variant
  // sets without offering a control for it — an icon-only Button's aria-label.
  const order = [
    ...controls.map((control) => control.name),
    ...Object.keys(props).filter((name) => !controlByName.has(name)),
  ];

  const printed = order.flatMap((name) => {
    if (name === "children") return [];
    const value = valueTokens(
      props[name],
      controlByName.get(name),
      defaultByName.get(name),
    );
    return value === null ? [] : [{ prop: name, value }];
  });

  const usedSamples = printed.flatMap(({ prop }) => {
    const sample = controlByName
      .get(prop)
      ?.samples?.find((choice) => choice.id === props[prop]);
    return sample === undefined ? [] : [sample];
  });

  const children = typeof props.children === "string" ? props.children : "";
  const open: CodeToken[] = [
    ["punct", "<"],
    ["component", element],
  ];

  const inlineLength =
    textOf(open).length +
    printed.reduce(
      (total, { prop, value }) =>
        total +
        ` ${prop}`.length +
        (value.length > 0 ? 1 : 0) +
        textOf(value).length,
      0,
    ) +
    (children === "" ? " />".length : `>${children}</${element}>`.length);
  const multiline = inlineLength > MAX_COLUMNS;

  const attributes: LabSnippetPart[] = printed.map(({ prop, value }) => ({
    id: `attr-${prop}`,
    lead: multiline ? "\n  " : " ",
    tokens: [["attr", prop], ...(value.length > 0 ? EQUALS : [])],
    value,
  }));

  const close: LabSnippetPart[] =
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
            lead: multiline ? "\n  " : "",
            tokens: [["plain", children]],
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

  const bindings = new Map([
    [element, importPath],
    ...usedSamples.flatMap((sample) =>
      sample.imports.map((binding) => [binding.name, binding.from] as const),
    ),
  ]);
  const imports: LabSnippetPart[] = [...bindings].map(
    ([name, from], index) => ({
      id: `import-${name}`,
      lead: index === 0 ? "" : "\n",
      tokens: importLine(name, from),
    }),
  );

  const parts: LabSnippetPart[] = [
    ...imports,
    { id: "open", lead: "\n\n", tokens: open },
    ...attributes,
    ...close,
  ];

  const text = parts
    .map((part) => part.lead + textOf(part.tokens) + textOf(part.value ?? []))
    .join("");

  return { parts, text };
}
