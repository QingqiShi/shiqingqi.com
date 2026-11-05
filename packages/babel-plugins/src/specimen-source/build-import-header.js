// @ts-check

/**
 * @typedef {import("./collect-module-facts").ImportedName} ImportedName
 * @typedef {import("./collect-module-facts").ModuleFacts} ModuleFacts
 */

/** Where prettier wraps, so a generated import header wraps with it. */
const PRINT_WIDTH = 80;

// ── The import header ────────────────────────────────────────────────────────

/**
 * Emit an import declaration for every imported name the snippet uses.
 *
 * @param {ModuleFacts} facts
 * @param {Set<string>} names
 * @returns {string}
 */
function buildImportHeader(facts, names) {
  /** @type {Map<string, ImportedName[]>} */
  const bySource = new Map();
  for (const name of names) {
    const imported = facts.imports.get(name);
    if (!imported) continue;
    const group = bySource.get(imported.source);
    if (group) group.push(imported);
    else bySource.set(imported.source, [imported]);
  }

  /** @type {string[]} */
  const lines = [];
  for (const source of [...bySource.keys()].sort(compareSources)) {
    const specifiers = (bySource.get(source) ?? []).sort(
      (a, b) => a.order - b.order,
    );
    lines.push(...formatImport(source, specifiers));
  }
  return lines.join("\n");
}

/**
 * Print one import declaration, wrapping the way prettier would.
 *
 * @param {string} source
 * @param {ImportedName[]} specifiers
 * @returns {string[]}
 */
function formatImport(source, specifiers) {
  /** @type {string[]} */
  const lines = [];
  const namespace = specifiers.find((one) => one.kind === "namespace");
  if (namespace) {
    lines.push(`import * as ${namespace.local} from "${source}";`);
  }

  const defaults = specifiers.filter((one) => one.kind === "default");
  const named = specifiers.filter((one) => one.kind === "named");
  if (defaults.length === 0 && named.length === 0) return lines;

  const allType = [...defaults, ...named].every((one) => one.typeOnly);
  const keyword = allType ? "import type" : "import";
  const head = defaults.map((one) => one.local).join(", ");
  const parts = named.map((one) => {
    const prefix = !allType && one.typeOnly ? "type " : "";
    const body =
      one.imported === one.local
        ? one.local
        : `${one.imported} as ${one.local}`;
    return prefix + body;
  });

  const clause = [head, parts.length > 0 ? `{ ${parts.join(", ")} }` : ""]
    .filter(Boolean)
    .join(", ");
  // Prettier breaks a specifier list over lines only when there are two or
  // more to break.
  const single = `${keyword} ${clause} from "${source}";`;
  if (single.length <= PRINT_WIDTH || parts.length < 2) {
    lines.push(single);
    return lines;
  }

  lines.push(
    `${keyword} ${head ? `${head}, {` : "{"}`,
    ...parts.map((part) => `  ${part},`),
    `} from "${source}";`,
  );
  return lines;
}

/**
 * Order two import sources the way the repository's lint rule orders them.
 *
 * @param {string} a
 * @param {string} b
 */
function compareSources(a, b) {
  const byGroup = sourceGroup(a) - sourceGroup(b);
  if (byGroup !== 0) return byGroup;
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA !== lowerB) return lowerA < lowerB ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * @param {string} source
 */
function sourceGroup(source) {
  if (source.startsWith("node:")) return 0;
  if (source.startsWith("#")) return 2;
  if (source.startsWith("../")) return 3;
  if (source.startsWith("./")) return 4;
  return 1;
}

module.exports = { buildImportHeader };
