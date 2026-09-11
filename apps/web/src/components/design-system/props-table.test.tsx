import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { PROPS_DOCS } from "#src/_generated/props/index.ts";
import { setLocale } from "#src/i18n/server-locale.ts";
import { render, screen, within } from "#src/test-utils.tsx";
import { PropsTable } from "./props-table.tsx";

function rowFor(name: string) {
  const row = within(screen.getByRole("table"))
    .getAllByText(name)[0]
    ?.closest("tr");
  if (!row) throw new Error(`No row for ${name}`);
  return row;
}

describe("PropsTable", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("gives every generated prop a row, in the generated order", () => {
    render(<PropsTable component="button" />);

    const rows = within(screen.getByRole("table")).getAllByRole("rowheader");
    expect(rows.map((row) => row.textContent)).toEqual([
      "children",
      "bright",
      "hideLabelOnMobile",
      "icon",
      "size",
      "isActive",
      "look",
      "loading",
      "labelId",
      "aria-label",
      "aria-labelledby",
      "css",
    ]);
  });

  it("lists an enum member by member, and prints the default", () => {
    render(<PropsTable component="button" />);

    const cells = within(rowFor("size")).getAllByRole("cell");
    expect(cells[0]?.textContent).toBe('"sm""md""lg"');
    expect(cells[1]?.textContent).toBe('"md"');
  });

  it("marks a required prop and reports a component with no default", () => {
    render(<PropsTable component="table" />);

    expect(within(rowFor("caption")).getByText("Required")).toBeVisible();
    expect(
      within(screen.getByRole("table")).getAllByRole("cell")[1]?.textContent,
    ).toBe("–");
  });

  it("documents the css prop and the element it extends", () => {
    render(<PropsTable component="table" />);

    expect(
      within(screen.getByRole("table")).getAllByText("css")[0],
    ).toBeVisible();
    expect(screen.getByText(/Also accepts every/)).toHaveTextContent(
      "Also accepts every <table> attribute.",
    );
  });

  it("leaves no component inheriting HTML attributes without a css prop", () => {
    const missing = Object.entries(PROPS_DOCS)
      .filter(
        ([, doc]) =>
          doc.extendsHtml !== undefined &&
          !doc.props.some((prop) => prop.name === "css"),
      )
      .map(([name]) => name);

    expect(missing).toEqual([]);
  });

  it("reads the description in the page's locale", () => {
    setLocale("zh");
    render(<PropsTable component="button" />);

    const row = within(screen.getByRole("table"))
      .getAllByText("loading")[0]
      ?.closest("tr");
    expect(row?.textContent).toContain("aria-busy");
    expect(row?.textContent).toMatch(/[一-鿿]/);
  });

  it("documents a component every showcase names", () => {
    const directory = resolve(
      process.cwd(),
      "src/components/design-system/sections/components",
    );
    const named = new Set<string>();
    for (const file of readdirSync(directory)) {
      const source = readFileSync(`${directory}/${file}`, "utf8");
      for (const match of source.matchAll(/<PropsTable component="([^"]+)"/g)) {
        named.add(match[1]);
      }
    }

    expect([...named].filter((name) => !(name in PROPS_DOCS))).toEqual([]);
  });
});
