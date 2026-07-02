import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

// Copy the real tokens file to a throwaway tmp path so the route exercises the
// genuine read-edit-write path with no mocks. The path override env is read per
// call, so set it before importing the route. beforeEach restores a pristine
// copy so tests stay independent.
const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_TOKENS = path.resolve(
  here,
  "../../../../../../../packages/ui/src/tokens.stylex.ts",
);
const tmpDir = mkdtempSync(path.join(os.tmpdir(), "design-author-test-"));
const fixture = path.join(tmpDir, "tokens.stylex.ts");
process.env.DESIGN_AUTHOR_TOKENS_PATH = fixture;

const { POST: apply } = await import("./apply/route.ts");

function applyRequest(body: unknown) {
  return new NextRequest("http://localhost/api/design-system/author/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function readFixture(): string {
  return readFileSync(fixture, "utf8");
}

const applyResult = z.object({
  ok: z.literal(true),
  file: z.string(),
  edits: z.array(
    z.object({
      path: z.string(),
      value: z.string(),
      theme: z.enum(["light", "dark"]).nullable(),
      drift: z.string().nullable(),
    }),
  ),
});

const applyError = z.object({
  ok: z.literal(false),
  error: z.string(),
  failedPath: z.string().optional(),
});

beforeEach(() => {
  copyFileSync(SOURCE_TOKENS, fixture);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("author apply route", () => {
  it("rejects malformed JSON", async () => {
    const response = await apply(
      new NextRequest("http://localhost/api/design-system/author/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{{{",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a changeset with no edits", async () => {
    const response = await apply(
      applyRequest({ version: 1, createdAt: "x", edits: [] }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a scalar edit with an empty value", async () => {
    const response = await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          { kind: "length", path: "space._3", oldValue: "1rem", newValue: "" },
        ],
      }),
    );
    expect(response.status).toBe(400);
  });

  it("writes a color edit into the light object and leaves dark untouched", async () => {
    const response = await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "color",
            path: "color.textMain",
            theme: "light",
            oldValue: "rgb(48, 49, 46)",
            newValue: "#4B4D49",
            paletteSuggestion: {
              hue: "gray",
              tone: 40,
              hex: "#4B4D49",
              distance: 0,
            },
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    const parsed = applyResult.parse(body);
    expect(parsed.edits).toEqual([
      {
        path: "color.textMain",
        value: "gray._40",
        theme: "light",
        drift: null,
      },
    ]);

    const source = readFixture();
    expect(source).toContain("textMain: gray._40,"); // light edited
    expect(source).toContain("textMain: gray._92,"); // dark untouched
    expect(source).not.toContain("textMain: gray._20,"); // old light value gone
  });

  it("writes a color edit into the dark object when theme is dark", async () => {
    await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "color",
            path: "color.textMain",
            theme: "dark",
            oldValue: "rgb(233, 232, 228)",
            newValue: "#8A8C87",
            paletteSuggestion: {
              hue: "gray",
              tone: 60,
              hex: "#8A8C87",
              distance: 0,
            },
          },
        ],
      }),
    );
    const source = readFixture();
    expect(source).toContain("textMain: gray._60,"); // dark edited
    expect(source).toContain("textMain: gray._20,"); // light untouched
  });

  it("preserves the rgba recipe shape for translucent border tokens", async () => {
    await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "color",
            path: "color.accentBorder",
            theme: "light",
            oldValue: "rgba(91, 33, 182, 0.4)",
            newValue: "#7C3AED",
            paletteSuggestion: {
              hue: "purple",
              tone: 50,
              hex: "#7C3AED",
              distance: 0,
            },
          },
        ],
      }),
    );
    const source = readFixture();
    expect(source).toContain("accentBorder: `rgba(${purple_rgb._50}, 0.4)`,");
  });

  it("adds the palette import when a color snaps to a hue the file doesn't import", async () => {
    // `teal` is a system hue but is not imported by tokens.stylex.ts, so writing
    // `teal._50` without adding its import would break the build.
    const before = readFixture();
    expect(before).not.toContain("palette/hues/teal.stylex.ts");
    await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "color",
            path: "color.textMain",
            theme: "light",
            oldValue: "rgb(48, 49, 46)",
            newValue: "#0D4D45",
            paletteSuggestion: {
              hue: "teal",
              tone: 50,
              hex: "#0D4D45",
              distance: 0,
            },
          },
        ],
      }),
    );
    const source = readFixture();
    expect(source).toContain(
      'import { teal } from "./_generated/palette/hues/teal.stylex.ts";',
    );
    expect(source).toContain("textMain: teal._50,");
  });

  it("writes a length edit into the space defineVars group", async () => {
    await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "length",
            path: "space._3",
            oldValue: "1rem",
            newValue: "1.25rem",
          },
        ],
      }),
    );
    const source = readFixture();
    expect(source).toContain('_3: "1.25rem",');
  });

  it("flags an off-palette color pick with a drift note", async () => {
    const response = await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "color",
            path: "color.textMain",
            theme: "light",
            oldValue: "rgb(48, 49, 46)",
            newValue: "#4B4D49",
            paletteSuggestion: {
              hue: "gray",
              tone: 40,
              hex: "#4B4D49",
              distance: 99,
            },
          },
        ],
      }),
    );
    const parsed = applyResult.parse(await response.json());
    expect(parsed.edits[0].drift).not.toBeNull();
  });

  it("422s an unknown token and leaves the file unchanged", async () => {
    const before = readFixture();
    const response = await apply(
      applyRequest({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        edits: [
          {
            kind: "color",
            path: "color.doesNotExist",
            theme: "light",
            oldValue: "rgb(0, 0, 0)",
            newValue: "#000000",
            paletteSuggestion: {
              hue: "gray",
              tone: 0,
              hex: "#000000",
              distance: 0,
            },
          },
        ],
      }),
    );
    expect(response.status).toBe(422);
    const parsed = applyError.parse(await response.json());
    expect(parsed.failedPath).toBe("color.doesNotExist");
    expect(readFixture()).toBe(before);
  });
});
