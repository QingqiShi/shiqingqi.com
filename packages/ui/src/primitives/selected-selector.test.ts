import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { selectedSelector } from "./selected-selector.ts";

it("is the selector that selected.stylex.ts compiles", () => {
  const source = fs.readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "selected.stylex.ts",
    ),
    "utf8",
  );
  expect(source).toContain(JSON.stringify(selectedSelector));
});
