import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { schema } from "../schema.ts";

const folder = import.meta.dirname;
const QUERY_START = /\.(?:from|update|delete)\((\w+)\)/g;
const tableNames = new Set(Object.keys(schema));

/** The text of each `.from(table)`, `.update(table)` and `.delete(table)` call chain, up to the end of its statement. */
function queryChains(source: string) {
  const chains: string[] = [];
  for (const match of source.matchAll(QUERY_START)) {
    if (!tableNames.has(match[1])) continue;
    const end = source.indexOf(";", match.index);
    chains.push(source.slice(match.index, end === -1 ? undefined : end));
  }
  return chains;
}

describe("repository scope guard", () => {
  const files = readdirSync(folder).filter(
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
  );

  it("finds the repositories", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files)("%s scopes every query to the household", (file) => {
    const source = readFileSync(path.join(folder, file), "utf8");
    const unscoped = queryChains(source).filter(
      (chain) => !chain.includes("householdId"),
    );
    expect(unscoped).toEqual([]);
  });

  it("catches a query without a household", () => {
    expect(
      queryChains(
        "await db.select().from(transactions).where(eq(transactions.id, id));",
      ).filter((chain) => !chain.includes("householdId")),
    ).toHaveLength(1);
  });
});
