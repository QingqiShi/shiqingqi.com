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
  it("writes a file that is not there yet", () => {
    const file = path.join(dir, "out.ts");

    expect(writeFileSyncIfChanged(file, "one")).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe("one");
  });

  it("leaves an unchanged file's mtime alone", () => {
    const file = path.join(dir, "out.ts");
    writeFileSyncIfChanged(file, "one");
    const written = fs.statSync(file).mtimeMs;

    expect(writeFileSyncIfChanged(file, "one")).toBe(false);
    expect(fs.statSync(file).mtimeMs).toBe(written);
  });

  it("replaces the content when it differs", () => {
    const file = path.join(dir, "out.ts");
    writeFileSyncIfChanged(file, "one");

    expect(writeFileSyncIfChanged(file, "two")).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe("two");
  });

  it("leaves no temporary file behind", () => {
    writeFileSyncIfChanged(path.join(dir, "out.ts"), "one");

    expect(fs.readdirSync(dir)).toEqual(["out.ts"]);
  });
});

describe("cleanStaleFiles", () => {
  it("removes the files this run did not write", () => {
    fs.writeFileSync(path.join(dir, "kept.ts"), "");
    fs.writeFileSync(path.join(dir, "stale.ts"), "");

    expect(cleanStaleFiles(dir, new Set(["kept.ts"]))).toEqual(["stale.ts"]);
    expect(fs.readdirSync(dir)).toEqual(["kept.ts"]);
  });

  it("leaves a subdirectory alone", () => {
    fs.mkdirSync(path.join(dir, "nested"));

    expect(cleanStaleFiles(dir, new Set())).toEqual([]);
    expect(fs.existsSync(path.join(dir, "nested"))).toBe(true);
  });
});
