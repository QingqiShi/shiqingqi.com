/**
 * What a run of a TypeScript type is. `label` is a name that a `:` follows:
 * an object key or a parameter.
 */
export type TypeTokenKind =
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "label"
  | "name"
  | "punct"
  | "space";

type TypeToken = readonly [TypeTokenKind, string];

const KEYWORDS = new Set([
  "any",
  "bigint",
  "boolean",
  "extends",
  "false",
  "infer",
  "keyof",
  "never",
  "null",
  "number",
  "object",
  "readonly",
  "string",
  "symbol",
  "true",
  "typeof",
  "undefined",
  "unknown",
  "void",
]);

const RUN =
  /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*|=>|\s+|./g;

/**
 * Splits a type as the props codegen prints it into runs to colour. Joining
 * the runs gives the input back.
 */
export function typeTokens(type: string): TypeToken[] {
  const runs = type.match(RUN) ?? [];
  return runs.map((run, index): TypeToken => {
    if (/^\s/.test(run)) return ["space", run];
    if (run.startsWith('"') || run.startsWith("'")) return ["string", run];
    if (/^\d/.test(run)) return ["number", run];
    if (!/^[A-Za-z_$]/.test(run)) return ["punct", run];
    if (KEYWORDS.has(run)) return ["keyword", run];
    const next = runs.slice(index + 1).find((later) => !/^\s/.test(later));
    if (next === ":" || next === "?") return ["label", run];
    return /^[A-Z]/.test(run) ? ["type", run] : ["name", run];
  });
}
