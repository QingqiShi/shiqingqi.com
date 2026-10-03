import fs from "node:fs";
import path from "node:path";

export interface ComponentEntry {
  /** The export subpath name — `"menu-button"`, `"use-ripple"`. */
  name: string;
  /** The exported function to document — `"MenuButton"`, `"useRipple"`. */
  component: string;
  /** A component documents its props; a hook, its options. */
  kind: "component" | "hook";
  /** Absolute path of the source. */
  file: string;
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const SOURCES = [
  {
    prefix: "./components/",
    extension: ".tsx",
    kind: "component",
    exportName: toPascalCase,
  },
  {
    prefix: "./hooks/",
    extension: ".ts",
    kind: "hook",
    exportName: toCamelCase,
  },
] as const;

/**
 * Every `./components/<name>` export of `@tuja/ui` that points at a `.tsx`
 * source, and every `./hooks/<name>` export that points at a `.ts` source.
 * The `.stylex.ts` and helper exports under the components prefix are not
 * components, so they are left out.
 */
export function collectComponentEntries(
  uiPackageDir: string,
): ComponentEntry[] {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(uiPackageDir, "package.json"), "utf8"),
  ) as { exports?: Record<string, unknown> };

  const entries: ComponentEntry[] = [];
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    if (typeof target !== "string") continue;
    const source = SOURCES.find(
      ({ prefix, extension }) =>
        subpath.startsWith(prefix) && target.endsWith(extension),
    );
    if (!source) continue;
    const name = subpath.slice(source.prefix.length);
    entries.push({
      name,
      component: source.exportName(name),
      kind: source.kind,
      file: path.resolve(uiPackageDir, target),
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}
