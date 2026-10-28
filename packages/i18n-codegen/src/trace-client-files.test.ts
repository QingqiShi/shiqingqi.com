import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { traceClientFiles } from "./trace-client-files.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, "../../../apps/web/src");

describe("traceClientFiles", () => {
  it("follows dynamic import() into lazily loaded client components", () => {
    const entryFile = path.join(
      srcDir,
      "app/[locale]/movie-database/(list)/page.tsx",
    );
    const clientFiles = traceClientFiles(entryFile, srcDir);
    const relativePaths = [...clientFiles].map((f) => path.relative(srcDir, f));

    // `media-list.tsx` reaches the table only through a
    // `dynamic(() => import(".../media-table.tsx"))` call. Its translations
    // still belong in the page's client bundle, so the tracer has to walk that
    // expression.
    expect(relativePaths).toContain(
      "movie-database/browse/table/media-table.tsx",
    );
    expect(relativePaths).toContain(
      "movie-database/browse/table/media-table-header.tsx",
    );
  });
});
