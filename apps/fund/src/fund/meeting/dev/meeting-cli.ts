import { readCliOptions } from "@tuja/dev-tools/read-cli-options";
import { exchangeDate } from "../../market/exchange-date.ts";
import { sessionFor } from "../session-for.ts";
import {
  openLocalFund,
  readCommonOptions,
  runMeetingToEnd,
} from "./open-local-fund.ts";

/**
 * Runs one meeting to its end against the local database of `pnpm dev`:
 * `--kind strategy|daily`, `--as-of YYYY-MM-DD` (default: today's session in
 * London), `--tier dev|live`, `--universe A,B,C` for a cheap run,
 * `--skip-refresh`, `--language zh|en`, and `--deadline-seconds N` to stop
 * early, as a Vercel invocation does, so that a second call continues.
 */
async function main() {
  const values = readCliOptions({
    kind: { type: "string" },
    "as-of": { type: "string" },
    tier: { type: "string" },
    universe: { type: "string" },
    "skip-refresh": { type: "boolean" },
    language: { type: "string" },
    "deadline-seconds": { type: "string" },
  });
  const kind = values.kind;
  if (kind !== "strategy" && kind !== "daily") {
    throw new Error("Give --kind strategy or --kind daily.");
  }
  const options = readCommonOptions(values);
  const asOf =
    values["as-of"] ?? sessionFor(exchangeDate(new Date(), "Europe/London"));
  const fund = await openLocalFund(options);
  try {
    const completed = await runMeetingToEnd(fund.deps, {
      kind,
      asOf,
      tier: options.tier,
      deadlineSeconds: values["deadline-seconds"]
        ? Number(values["deadline-seconds"])
        : undefined,
    });
    if (!completed) process.exitCode = 1;
  } finally {
    await fund.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
