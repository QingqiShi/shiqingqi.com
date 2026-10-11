import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readNextDevEnv } from "./read-dev-finance-env.ts";

describe("readNextDevEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lets the shell win over the env files, also with an empty value", () => {
    const appDir = mkdtempSync(path.join(tmpdir(), "read-next-dev-env-"));
    writeFileSync(
      path.join(appDir, ".env"),
      "READ_ENV_FILE=file\nREAD_ENV_SHELL=file\nREAD_ENV_EMPTY=file\n",
    );
    vi.stubEnv("READ_ENV_SHELL", "shell");
    vi.stubEnv("READ_ENV_EMPTY", "");

    const env = readNextDevEnv(appDir);

    expect(env).toMatchObject({
      READ_ENV_FILE: "file",
      READ_ENV_SHELL: "shell",
      READ_ENV_EMPTY: "",
    });
  });

  it("leaves process.env as the shell gave it", () => {
    const appDir = mkdtempSync(path.join(tmpdir(), "read-next-dev-env-"));
    writeFileSync(path.join(appDir, ".env"), "READ_ENV_FILE=file\n");
    vi.stubEnv("READ_ENV_EMPTY", "");
    const before = { ...process.env };

    readNextDevEnv(appDir);

    expect(process.env).toEqual(before);
  });
});
