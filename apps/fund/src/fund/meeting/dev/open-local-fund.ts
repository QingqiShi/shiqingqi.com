import { createAnthropic } from "@ai-sdk/anthropic";
import { eq, sql } from "drizzle-orm";
import { openLocalDb } from "#src/db/dev/open-local-db.ts";
import type { FundDb } from "#src/db/types.ts";
import { modelTierFromEnv, type ModelTier } from "../../agents/model-for.ts";
import {
  reportLanguageFromEnv,
  type ReportLanguage,
} from "../../agents/prompts.ts";
import { runSteps, runs } from "../../fund-schema.ts";
import { refreshMarketData } from "../../market/refresh-market-data.ts";
import { yahooMarketProvider } from "../../market/yahoo-market-provider.ts";
import { advanceRun } from "../advance-run.ts";
import { anthropicAgentCaller } from "../anthropic-agent-caller.ts";
import { startMeeting } from "../start-meeting.ts";
import type { MeetingDeps, StepEndEvent } from "../types.ts";

export interface CliOptions {
  tier: ModelTier;
  language: ReportLanguage;
  universe: string[] | null;
  refresh: boolean;
}

export function readCommonOptions(values: {
  tier?: string;
  language?: string;
  universe?: string;
  "skip-refresh"?: boolean;
}): CliOptions {
  const language =
    values.language ?? reportLanguageFromEnv(process.env.FUND_REPORT_LANGUAGE);
  if (language !== "zh" && language !== "en") {
    throw new Error(`--language takes zh or en, not ${language}.`);
  }
  if (
    values.tier !== undefined &&
    values.tier !== "dev" &&
    values.tier !== "live"
  ) {
    throw new Error(`--tier takes dev or live, not ${values.tier}.`);
  }
  return {
    tier: modelTierFromEnv(values.tier ?? process.env.FUND_MODEL_TIER),
    language,
    universe:
      values.universe
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? null,
    refresh: !(values["skip-refresh"] ?? false),
  };
}

function printStep(event: StepEndEvent) {
  const mark = { done: "✓", failed: "✗", skipped: "–" }[event.status];
  const failed = event.usage?.webSearchErrors?.length
    ? ` (failed: ${event.usage.webSearchErrors.join(", ")})`
    : "";
  const usage = event.usage
    ? `  in ${String(event.usage.inputTokens)} out ${String(event.usage.outputTokens)} search ${String(event.usage.webSearches)}${failed}  $${event.usage.costUsd.toFixed(4)}`
    : "";
  console.log(
    `${mark} ${event.key.padEnd(22)} ${event.seconds.toFixed(1).padStart(6)} s  ${event.model ?? ""}${usage}${event.error ? `\n    ${event.error}` : ""}`,
  );
}

/** The local database of `pnpm dev`, and meeting dependencies for a CLI. */
export async function openLocalFund(options: CliOptions) {
  const { db, close } = await openLocalDb({
    cli: "The fund CLI",
    maxConnections: 8,
  });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const deps: MeetingDeps = {
    db,
    agent: (request) => {
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set. Run the CLI from apps/web under `vercel env run -e development -- pnpm …`.",
        );
      }
      return anthropicAgentCaller(createAnthropic({ apiKey }))(request);
    },
    language: options.language,
    universe: options.universe,
    refreshMarket: options.refresh
      ? (symbols) =>
          refreshMarketData(db, {
            now: new Date(),
            provider: yahooMarketProvider(),
            symbols,
          })
      : null,
    now: () => new Date(),
    onStepEnd: printStep,
  };
  return { db, deps, close };
}

/** Starts or continues one meeting and runs it to its end. Returns false when it did not complete. */
export async function runMeetingToEnd(
  deps: MeetingDeps,
  {
    kind,
    asOf,
    tier,
    deadlineSeconds = 3600,
  }: {
    kind: "strategy" | "daily";
    asOf: string;
    tier: ModelTier;
    deadlineSeconds?: number;
  },
): Promise<boolean> {
  const started = await startMeeting(deps.db, { kind, asOf, tier });
  console.log(`\n${kind} meeting for ${asOf}: ${started.status}`);
  if (started.status === "blocked") {
    console.log(`Orders to check first: ${started.ordersToCheck.join(", ")}`);
    return false;
  }
  if (started.status === "needs_strategy" || started.status === "completed") {
    return started.status === "completed";
  }
  const wall = performance.now();
  const outcome = await advanceRun(deps, started.runId, {
    deadline: Date.now() + deadlineSeconds * 1000,
  });
  const seconds = (performance.now() - wall) / 1000;
  await printUsage(deps.db, started.runId, seconds, outcome);
  return outcome === "completed";
}

async function printUsage(
  db: FundDb,
  runId: string,
  seconds: number,
  outcome: string,
) {
  const rows = await db
    .select({
      role: runSteps.role,
      steps: sql<number>`count(*)::int`,
      input: sql<number>`coalesce(sum((${runSteps.usage}->>'inputTokens')::numeric), 0)::float`,
      output: sql<number>`coalesce(sum((${runSteps.usage}->>'outputTokens')::numeric), 0)::float`,
      searches: sql<number>`coalesce(sum((${runSteps.usage}->>'webSearches')::numeric), 0)::float`,
      cost: sql<number>`coalesce(sum((${runSteps.usage}->>'costUsd')::numeric), 0)::float`,
      failed: sql<number>`count(*) filter (where ${runSteps.status} = 'failed')::int`,
    })
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .groupBy(runSteps.role);
  const run = (
    await db
      .select({ status: runs.status, error: runs.error })
      .from(runs)
      .where(eq(runs.id, runId))
  ).at(0);
  console.log(
    `\nRun ${runId}: ${outcome} (${run?.status ?? "?"}) in ${seconds.toFixed(0)} s${run?.error ? `: ${run.error}` : ""}`,
  );
  let total = 0;
  for (const row of rows) {
    total += row.cost;
    console.log(
      `  ${row.role.padEnd(10)} ${String(row.steps).padStart(3)} steps (${String(row.failed)} failed)  in ${String(row.input)}  out ${String(row.output)}  searches ${String(row.searches)}  $${row.cost.toFixed(4)}`,
    );
  }
  console.log(`  total estimated cost $${total.toFixed(4)}`);
}
