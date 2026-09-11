import fs from "node:fs";
import path from "node:path";

export interface ComponentEntry {
  /** The `./components/<name>` export subpath name — `"menu-button"`. */
  name: string;
  /** The exported function to document — `"MenuButton"`. */
  component: string;
  /** Absolute path of the component source. */
  file: string;
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Every `./components/<name>` export of `@tuja/ui` that points at a `.tsx`
 * source. The `.stylex.ts` and helper exports under the same prefix are not
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
    if (!subpath.startsWith("./components/")) continue;
    if (typeof target !== "string" || !target.endsWith(".tsx")) continue;
    const name = subpath.slice("./components/".length);
    entries.push({
      name,
      component: toPascalCase(name),
      file: path.resolve(uiPackageDir, target),
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}
