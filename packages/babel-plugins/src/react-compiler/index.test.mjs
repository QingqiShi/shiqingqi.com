import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { reactCompilerVitePlugins } = require("./index");

describe("reactCompilerVitePlugins", () => {
  const [compilerPass] = reactCompilerVitePlugins({
    include: /\/src\/.*\.tsx?$/,
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
});
