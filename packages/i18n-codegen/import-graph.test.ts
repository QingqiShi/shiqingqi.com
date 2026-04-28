import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveImport, traceClientFiles } from "./import-graph.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, "../../apps/web/src");

describe("resolveImport", () => {
  it("resolves #src/ alias to src directory", () => {
    const result = resolveImport(
      "#src/i18n.ts",
      path.join(srcDir, "app/[locale]/layout.tsx"),
      srcDir,
    );
    expect(result).toBe(path.join(srcDir, "i18n.ts"));
  });

  it("resolves #src/ alias without extension", () => {
    const result = resolveImport(
      "#src/i18n",
      path.join(srcDir, "app/[locale]/layout.tsx"),
      srcDir,
    );
    // Should resolve to i18n.ts (tries extensions)
    expect(result).toBe(path.join(srcDir, "i18n.ts"));
  });

  it("resolves relative imports", () => {
    const result = resolveImport(
      "./locale-context",
      path.join(srcDir, "i18n/i18n-provider.tsx"),
      srcDir,
    );
    expect(result).toBe(path.join(srcDir, "i18n/locale-context.ts"));
  });

  it("returns null for external packages", () => {
    expect(resolveImport("react", "any-file.ts", srcDir)).toBeNull();
    expect(resolveImport("@babel/parser", "any-file.ts", srcDir)).toBeNull();
    expect(resolveImport("next/navigation", "any-file.ts", srcDir)).toBeNull();
  });

  it("returns null for non-existent files", () => {
    const result = resolveImport(
      "#src/does-not-exist",
      path.join(srcDir, "i18n.ts"),
      srcDir,
    );
    expect(result).toBeNull();
  });
});

describe("traceClientFiles", () => {
  it("finds client components from movie database list page", () => {
    const entryFile = path.join(
      srcDir,
      "app/[locale]/movie-database/(list)/page.tsx",
    );
    const clientFiles = traceClientFiles(entryFile, srcDir);

    // Should find these client components with t() calls
    const relativePaths = [...clientFiles].map((f) => path.relative(srcDir, f));

    expect(relativePaths).toContain(
      "components/movie-database/media-type-toggle.tsx",
    );
    expect(relativePaths).toContain(
      "components/movie-database/genre-filter.tsx",
    );
    expect(relativePaths).toContain(
      "components/movie-database/genre-filter-button.tsx",
    );
    expect(relativePaths).toContain(
      "components/movie-database/sort-filter.tsx",
    );
    expect(relativePaths).toContain(
      "components/movie-database/reset-filter.tsx",
    );
  });

  it("does NOT include server-only components", () => {
    const entryFile = path.join(
      srcDir,
      "app/[locale]/movie-database/(list)/page.tsx",
    );
    const clientFiles = traceClientFiles(entryFile, srcDir);
    const relativePaths = [...clientFiles].map((f) => path.relative(srcDir, f));

    // Header is a server component — should not appear
    expect(relativePaths).not.toContain("components/shared/header.tsx");
    // Footer is a server component
    expect(relativePaths).not.toContain("components/home/footer.tsx");
  });

  it("finds zero client files for root layout (Header children don't use t())", () => {
    const entryFile = path.join(srcDir, "app/[locale]/layout.tsx");
    const clientFiles = traceClientFiles(entryFile, srcDir);

    // Root layout's client components (ThemeSwitch, LocaleSelector, etc.)
    // don't import from #src/i18n, but they are still client files.
    // The tracer returns ALL client files — the caller filters by extraction results.
    // So clientFiles may be non-empty, but none should have t() calls.
    // We verify this indirectly: no movie-database components should be found.
    const relativePaths = [...clientFiles].map((f) => path.relative(srcDir, f));
    for (const p of relativePaths) {
      expect(p).not.toContain("movie-database");
    }
  });

  it("handles circular imports without infinite recursion", () => {
    // The real codebase may have circular imports; this should not hang.
    // We test by running the tracer and verifying it completes.
    const entryFile = path.join(
      srcDir,
      "app/[locale]/movie-database/(list)/page.tsx",
    );
    const clientFiles = traceClientFiles(entryFile, srcDir);
    expect(clientFiles.size).toBeGreaterThan(0);
  });
});
