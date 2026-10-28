import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanStaleFiles, writeFileSyncIfChanged } from "./index.ts";

let dir = "";

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "codegen-fs-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("writeFileSyncIfChanged", () => {
  it("replaces the content when it differs", () => {
    const file = path.join(dir, "out.ts");
    writeFileSyncIfChanged(file, "one");

    expect(writeFileSyncIfChanged(file, "two")).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe("two");
  });
});

describe("cleanStaleFiles", () => {
  it("removes the files this run did not write", () => {
    fs.writeFileSync(path.join(dir, "kept.ts"), "");
    fs.writeFileSync(path.join(dir, "stale.ts"), "");

    expect(cleanStaleFiles(dir, new Set(["kept.ts"]))).toEqual(["stale.ts"]);
    expect(fs.readdirSync(dir)).toEqual(["kept.ts"]);
  });
});
