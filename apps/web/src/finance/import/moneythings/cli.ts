import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "../../db/schema.ts";
import { minorUnitsToDecimalString } from "../../domain/money/to-minor-units.ts";
import { isGroupKey, type GroupKey } from "./assign-group.ts";
import { importMoneyThings } from "./import-money-things.ts";
import { mapMoneyThings, type MappingReport } from "./map-money-things.ts";
import { mapOptionsFor } from "./map-options-for.ts";
import { readBackup } from "./read-backup.ts";
import { readBalanceState } from "./read-balance-state.ts";
import type { OwnerKey } from "./split-owner-prefix.ts";
import type { ImportRows } from "./types.ts";
import {
  monthlyHistoryDates,
  verifyBalances,
  verifyImport,
  type SeriesPoint,
  type VerifyCheck,
} from "./verify-import.ts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function parseSeries(csv: string): SeriesPoint[] {
  const [header = "", ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const dateColumn = columns.indexOf("date");
  const valueColumn = columns.indexOf("app_nw");
  if (dateColumn === -1 || valueColumn === -1) {
    throw new Error("The series CSV needs the columns date and app_nw");
  }
  return lines.map((line) => {
    const cells = line.split(",");
    return {
      date: cells[dateColumn],
      netWorthMinor: Math.round(Number(cells[valueColumn]) * 100),
    };
  });
}

function printChecks(checks: readonly VerifyCheck[]) {
  for (const check of checks) {
    console.log(
      `${check.ok ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`,
    );
  }
}

function printMapping(rows: ImportRows, report: MappingReport) {
  const names = new Map(rows.accounts.map((a) => [a.id, a.name]));
  console.log("\nMapping:");
  for (const [key, value] of Object.entries(report.counts)) {
    console.log(`  ${key}: ${String(value)}`);
  }
  console.log(
    `  unknown tag ids ignored: ${String(report.unknownTagIds.length)}`,
  );
  console.log(
    `\nRounding moved ${String(report.roundings.length)} amounts by more than 0.001:`,
  );
  for (const note of report.roundings) {
    console.log(
      `  ${note.table} ${note.id}: ${String(note.source)} ${note.currency} → ${minorUnitsToDecimalString(note.minor, note.currency)}`,
    );
  }
  console.log("Rounding residue per account (minor units, rounded − source):");
  for (const [accountId, residue] of report.residueByAccount) {
    if (Math.abs(residue) < 1e-6) continue;
    console.log(
      `  ${names.get(accountId) ?? accountId}: ${residue.toFixed(4)}`,
    );
  }
  console.log("\nClosed or excluded accounts:");
  for (const account of rows.accounts) {
    if (account.closedOn || account.excludedFromNetWorth) {
      console.log(
        `  ${account.name} (${account.kind})${account.closedOn ? ` closed on ${account.closedOn}` : ""}${account.excludedFromNetWorth ? " excluded from net worth" : ""}`,
      );
    }
  }
}

function parseOwnerPairs(flag: string, values: readonly string[]) {
  const result: Partial<Record<OwnerKey, string>> = {};
  for (const value of values) {
    const [prefix, rest] = value.split("=");
    if (prefix === "老公" && rest) result.husband = rest;
    else if (prefix === "老婆" && rest) result.wife = rest;
    else
      throw new Error(
        `${flag} takes 老公=<value> or 老婆=<value>, not ${value}`,
      );
  }
  return result;
}

async function readGroupOverrides(file: string | undefined) {
  if (!file) return {};
  const value: unknown = JSON.parse(await readFile(file, "utf8"));
  const overrides: Record<string, GroupKey> = {};
  if (typeof value !== "object" || value === null) {
    throw new Error(
      "--groups needs a JSON object of account name to group key",
    );
  }
  for (const [name, group] of Object.entries(value)) {
    if (!isGroupKey(group)) {
      throw new Error(`Unknown group ${String(group)} for ${name}`);
    }
    overrides[name] = group;
  }
  return overrides;
}

async function main() {
  const { values } = parseArgs({
    options: {
      backup: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      series: { type: "string" },
      "expect-net-worth": { type: "string" },
      household: { type: "string" },
      "household-name": { type: "string" },
      member: { type: "string", multiple: true, default: [] },
      "member-name": { type: "string", multiple: true, default: [] },
      groups: { type: "string" },
      force: { type: "boolean", default: false },
      "allow-remote": { type: "boolean", default: false },
    },
  });
  if (!values.backup) {
    throw new Error(
      "Usage: finance:import --backup <MoneyThings-Backup.zip> [--dry-run] [--series <csv>] [--expect-net-worth <minor units>] [--household <id>] [--household-name <name>] [--member 老公=<id>] [--member-name 老公=<name>] [--groups <overrides.json>] [--allow-remote] [--force]",
    );
  }

  const started = performance.now();
  const source = await readBackup(values.backup);
  const defaults = mapOptionsFor(source);
  const options = mapOptionsFor(source, {
    householdId: values.household ?? defaults.householdId,
    memberIds: {
      ...defaults.memberIds,
      ...parseOwnerPairs("--member", values.member),
    },
    memberNames: {
      ...defaults.memberNames,
      ...parseOwnerPairs("--member-name", values["member-name"]),
    },
    groupOverrides: await readGroupOverrides(values.groups),
  });
  const read = performance.now();
  const { rows, report } = mapMoneyThings(source, options);
  const mapped = performance.now();
  const verifyOptions = {
    baseCurrency: options.baseCurrency,
    timeZone: options.timeZone,
    asOf: options.importDate,
    asOfTime: options.importedAt,
    expectedUntil: options.expectedUntil,
    expectedNetWorthMinor: values["expect-net-worth"]
      ? Number(values["expect-net-worth"])
      : undefined,
    series: values.series
      ? parseSeries(await readFile(values.series, "utf8"))
      : undefined,
  };
  const verification = verifyImport(rows, source, verifyOptions);
  const verified = performance.now();

  printMapping(rows, report);
  console.log("\nVerification of the mapped rows:");
  printChecks(verification.checks);
  for (const line of verification.lines) console.log(line);
  console.log(
    `\nTiming: read ${(read - started).toFixed(0)} ms, map ${(mapped - read).toFixed(0)} ms, verify ${(verified - mapped).toFixed(0)} ms`,
  );

  if (!verification.ok) {
    console.error("\nVerification failed: nothing written.");
    process.exitCode = 1;
    return;
  }
  if (values["dry-run"]) {
    console.log("\nDry run: nothing written.");
    return;
  }

  const connectionString = process.env.FINANCE_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set FINANCE_DATABASE_URL, or pass --dry-run.");
  }
  const { hostname } = new URL(connectionString);
  if (!LOCAL_HOSTS.has(hostname) && !values["allow-remote"]) {
    throw new Error(
      `FINANCE_DATABASE_URL points at ${hostname}, not this machine. Pass --allow-remote to import into it anyway.`,
    );
  }
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle({ client: pool, schema });
    const writeStarted = performance.now();
    const result = await importMoneyThings(db, rows, {
      options,
      householdName: values["household-name"] ?? source.sceneName,
      force: values.force,
    });
    // The query planner needs statistics for the new rows. PGlite does not run autovacuum.
    await pool.query("analyze");
    const written = performance.now();
    const stored = verifyBalances(
      await readBalanceState(db, result.householdId),
      source,
      {
        ...verifyOptions,
        historyDates: monthlyHistoryDates(rows, options.importDate),
      },
    );
    console.log(
      `\nWrote household ${result.householdId}${result.createdHousehold ? " (new)" : ""} at version ${String(result.version)}; ${String(result.staleRows)} stale rows soft-deleted; ${(written - writeStarted).toFixed(0)} ms`,
    );
    console.log("\nVerification of the stored balances:");
    printChecks(stored.checks);
    for (const line of stored.lines) console.log(line);
    if (!stored.checks.every((check) => check.ok)) {
      console.error("\nThe stored balances do not match MoneyThings.");
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
