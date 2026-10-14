import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { reactCompilerVitePlugins } = require("./index");

describe("reactCompilerVitePlugins", () => {
  const [compilerPass] = reactCompilerVitePlugins({
    include: /\/src\/.*\.tsx?$/,
  });

  it("memoizes a component it can compile", async () => {
    const result = await compilerPass.transform(
      `export function Total({ items }: { items: string[] }) {
        return <span>{items.join(", ")}</span>;
      }`,
      "/app/src/total.tsx",
    );
    expect(result?.code).toContain("react/compiler-runtime");
  });

  it("compiles a destructured default, which the compiler cannot compile under Babel 8", async () => {
    const result = await compilerPass.transform(
      `export function Heading({ level = 3 }: { level?: number }) {
        return <h1 aria-level={level} />;
      }`,
      "/app/src/heading.tsx",
    );
    expect(result?.code).toContain("react/compiler-runtime");
  });

  it("keeps the TypeScript for the transforms after it", async () => {
    const result = await compilerPass.transform(
      `export function useLevel<T>(value: T): T {
        return value;
      }`,
      "/app/src/use-level.ts",
    );
    expect(result?.code).toContain("value: T");
  });

  it("leaves a file that `include` does not match", async () => {
    expect(
      await compilerPass.transform(
        "export function useA() { return useB(); }",
        "/app/other/a.ts",
      ),
    ).toBeNull();
  });

  it("leaves a file that cannot have a component or hook", async () => {
    expect(
      await compilerPass.transform(
        "export const total = (items: string[]) => items.length;",
        "/app/src/total.ts",
      ),
    ).toBeNull();
  });

  it("runs the source plugins on a file that cannot have a component or hook", async () => {
    const [pass] = reactCompilerVitePlugins({
      include: /\/src\/.*\.tsx?$/,
      sourcePlugins: [
        () => ({
          visitor: {
            NumericLiteral(path) {
              path.node.value = 2;
            },
          },
        }),
      ],
    });
    const result = await pass.transform(
      "export const total = 1;",
      "/app/src/total.ts",
    );
    expect(result?.code).toContain("total = 2");
  });

  it("fails a component it cannot compile instead of skipping it", async () => {
    await expect(
      compilerPass.transform(
        `export function Total({ items }: { items: string[] }) {
          let total = 0;
          try {
            total = items.length;
          } finally {
            total += 1;
          }
          return <span>{total}</span>;
        }`,
        "/app/src/total.tsx",
      ),
    ).rejects.toThrow(/TryStatement/);
  });

  it("adds the Babel transforms after the compiler pass", () => {
    const plugins = reactCompilerVitePlugins({
      include: /\/src\/.*\.tsx?$/,
      babel: { presets: ["@babel/preset-typescript"] },
    });
    expect(plugins).toHaveLength(2);
    expect(plugins[0]).toHaveProperty("enforce", "pre");
  });
});
