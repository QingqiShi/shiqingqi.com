import { describe, expect, it } from "vitest";
import { assertLocalDatabaseUrl } from "./assert-local-database-url.ts";

const HINT = "Pass --force.";

describe("assertLocalDatabaseUrl", () => {
  it.each([
    "postgres://postgres:postgres@localhost:5433/postgres",
    "postgres://postgres:postgres@127.0.0.1:5433/postgres",
    "postgres://postgres:postgres@[::1]:5433/postgres",
  ])("accepts %s", (url) => {
    expect(() => {
      assertLocalDatabaseUrl(url, HINT);
    }).not.toThrow();
  });

  it.each([
    ["postgres://u:p@db.example.com:5432/app", "db.example.com"],
    ["postgres://u:p@localhost:5433/app?host=example.com", "example.com"],
    ["postgres://u:p@127.0.0.1:5433/app?hostaddr=203.0.113.7", "203.0.113.7"],
    ["postgres://u:p@/app", "no host"],
  ])("refuses %s", (url, remote) => {
    expect(() => {
      assertLocalDatabaseUrl(url, HINT);
    }).toThrow(
      `FINANCE_DATABASE_URL points at ${remote}, not this machine. ${HINT}`,
    );
  });
});
