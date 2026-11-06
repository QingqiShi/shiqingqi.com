import type { CodePart, CodeToken } from "@tuja/ui/components/code-block";
import { textOf } from "./print-lab-value.ts";
import type { LabImport } from "./types.ts";

/** One indent step, as Prettier prints it. */
const INDENT = 2;

function importTokens(
  bindings: readonly LabImport[],
  from: string,
): CodeToken[] {
  const namespace = bindings.find((binding) => binding.isNamespace === true);
  if (namespace !== undefined) {
    return [
      ["keyword", "import"],
      ["plain", " "],
      ["punct", "*"],
      ["plain", " "],
      ["keyword", "as"],
      ["plain", " "],
      ["plain", namespace.name],
      ["plain", " "],
      ["keyword", "from"],
      ["plain", " "],
      ["string", `"${from}"`],
      ["punct", ";"],
    ];
  }
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

/** Where Prettier breaks an import over lines. */
const IMPORT_WIDTH = 80;

/** One import declaration, broken a binding to a line when it is too long. */
export function importLines(
  bindings: readonly LabImport[],
  from: string,
): CodeToken[][] {
  const flat = importTokens(bindings, from);
  if (bindings.length < 2 || textOf(flat).length <= IMPORT_WIDTH) {
    return [flat];
  }
  return [
    [
      ["keyword", "import"],
      ["plain", " "],
      ["punct", "{"],
    ],
    ...bindings.map(({ name, isType }): CodeToken[] => [
      ["plain", " ".repeat(INDENT)],
      ...(isType === true
        ? ([
            ["keyword", "type"],
            ["plain", " "],
          ] as const)
        : []),
      [/^[A-Z]/.test(name) ? "component" : "plain", name],
      ["punct", ","],
    ]),
    [
      ["punct", "}"],
      ["plain", " "],
      ["keyword", "from"],
      ["plain", " "],
      ["string", `"${from}"`],
      ["punct", ";"],
    ],
  ];
}

export function importLine(name: string, from: string): CodeToken[] {
  return importTokens([{ name, from }], from);
}

/**
 * The import lines of a snippet: one declaration per module, each binding
 * once, in the order the snippet first needs them.
 */
export function importParts(bindings: readonly LabImport[]): CodePart[] {
  const modules = new Map<string, LabImport[]>();
  for (const binding of bindings) {
    const key =
      binding.isNamespace === true ? `* ${binding.from}` : binding.from;
    const names = modules.get(key) ?? [];
    if (!names.some(({ name }) => name === binding.name)) names.push(binding);
    modules.set(key, names);
  }
  return [...modules].flatMap(([key, names], index) =>
    importLines(names, names[0]?.from ?? key).map((tokens, line) => ({
      id: `import-${key}${line === 0 ? "" : `:${textOf(tokens)}`}`,
      lead: index === 0 && line === 0 ? "" : "\n",
      tokens,
    })),
  );
}
