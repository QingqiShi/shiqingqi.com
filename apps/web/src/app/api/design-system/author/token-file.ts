import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { planColorEdit, planScalarEdit } from "./apply-plan.ts";
import type { TokenEdit } from "./changeset-schema.ts";
import {
  applyColorEditToSource,
  applyScalarEditToSource,
  ensurePaletteImport,
} from "./token-source-editor.ts";

// Reads `tokens.stylex.ts`, folds every edit through the pure source editor, and
// writes the result once — under an in-process lock so two rapid Applies can't
// interleave a read-modify-write. This replaces the old file-backed agent queue:
// the apply is now synchronous and deterministic.

const TOKENS_RELATIVE = path.join("packages", "ui", "src", "tokens.stylex.ts");

// Dev/test only. Tests point this at a throwaway tmp copy via the env override so
// they exercise the real read-edit-write path without mocking fs. Otherwise walk
// up from the cwd to find the tokens file — robust whether the dev server runs
// from the repo root or from `apps/web`.
function tokensPath(): string {
  const override = process.env.DESIGN_AUTHOR_TOKENS_PATH;
  if (override) return override;
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, TOKENS_RELATIVE);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(process.cwd(), TOKENS_RELATIVE);
}

export interface AppliedEdit {
  /** Token path, e.g. `color.textMain` or `space._3`. */
  path: string;
  /** The source expression/literal written, e.g. `gray._40` or `1.25rem`. */
  value: string;
  /** Theme the edit targeted (colors are per-theme); null for scalars. */
  theme: "light" | "dark" | null;
  /** Off-palette warning for colors snapped past the drift threshold. */
  drift: string | null;
}

// Serialize all file mutations through a promise chain so concurrent requests
// apply one at a time (no interleaved read-modify-write).
let lock: Promise<unknown> = Promise.resolve();
function withFileLock<T>(run: () => Promise<T>): Promise<T> {
  const next = lock.then(run, run);
  lock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function formatSource(source: string, filePath: string): Promise<string> {
  // Single-token splices are already format-clean, so a prettier miss is
  // non-fatal — fall back to the spliced source rather than failing the apply.
  try {
    const prettier = await import("prettier");
    const config = await prettier.resolveConfig(filePath);
    return await prettier.format(source, { ...config, parser: "typescript" });
  } catch {
    return source;
  }
}

/** Apply every edit to the tokens file and return what was written. */
export function applyEdits(edits: TokenEdit[]): Promise<AppliedEdit[]> {
  return withFileLock(async () => {
    const filePath = tokensPath();
    let source = await fs.readFile(filePath, "utf8");
    const applied: AppliedEdit[] = [];
    for (const edit of edits) {
      if (edit.kind === "color") {
        const plan = planColorEdit(edit);
        const member = edit.path.slice(edit.path.indexOf(".") + 1);
        // A re-mapped hue may not be imported yet — add its import before the
        // palette ref it introduces can dangle.
        if (plan.paletteImport) {
          source = await ensurePaletteImport(source, plan.paletteImport);
        }
        source = await applyColorEditToSource(source, member, plan);
        applied.push({
          path: edit.path,
          value: plan.expression,
          theme: edit.theme,
          drift: plan.drift,
        });
      } else {
        const plan = planScalarEdit(edit);
        source = await applyScalarEditToSource(source, plan);
        applied.push({
          path: edit.path,
          value: plan.value,
          theme: null,
          drift: null,
        });
      }
    }
    source = await formatSource(source, filePath);
    await fs.writeFile(filePath, source, "utf8");
    return applied;
  });
}
