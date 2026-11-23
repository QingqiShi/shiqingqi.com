import { desc, eq } from "drizzle-orm";
import "server-only";
import type { FundDb } from "#src/db/types.ts";
import {
  fundThesisSchema,
  positionThesisSchema,
  type FundThesis,
  type PositionThesis,
} from "../contracts/fund-thesis-schema.ts";
import { runs, theses, thesisVersions } from "../fund-schema.ts";
import type { Instrument, ScreenRow } from "../types.ts";
import { decidedOn } from "./decided-on.ts";
import { loadLatestScreen } from "./load-latest-screen.ts";

export interface ThesisVersionView {
  version: number;
  /** The day of the meeting that wrote it, `YYYY-MM-DD`. */
  decidedOn: string;
  changeNote: string | null;
  runId: string | null;
}

export interface PositionThesisView {
  id: string;
  symbol: string;
  name: string;
  status: "active" | "closed" | "invalidated";
  version: number;
  /** The day of the meeting that wrote it, `YYYY-MM-DD`. */
  decidedOn: string;
  changeNote: string | null;
  body: PositionThesis;
}

export type ScreenRowView = Pick<
  ScreenRow,
  "symbol" | "sector" | "composite" | "percentiles"
> & { name: string };

export interface ScreenView {
  asOf: string;
  runId: string;
  screened: number;
  shortlist: ScreenRowView[];
}

export interface ThesisView {
  fund: {
    body: FundThesis;
    version: number;
    /** The day of the meeting that wrote it, `YYYY-MM-DD`. */
    decidedOn: string;
    runId: string | null;
  } | null;
  /** Newest first. */
  fundVersions: ThesisVersionView[];
  positions: PositionThesisView[];
  screen: ScreenView | null;
}

/** The fund thesis with its history, each position's thesis, and the newest screen. */
export async function loadThesis(
  db: FundDb,
  instruments: readonly Instrument[],
): Promise<ThesisView> {
  const nameOf = new Map(
    instruments.map((instrument) => [instrument.symbol, instrument.name]),
  );
  const [rows, screen] = await Promise.all([
    db
      .select({
        thesisId: theses.id,
        scope: theses.scope,
        symbol: theses.symbol,
        status: theses.status,
        version: thesisVersions.version,
        runId: thesisVersions.runId,
        body: thesisVersions.body,
        changeNote: thesisVersions.changeNote,
        createdAt: thesisVersions.createdAt,
        runAsOf: runs.asOf,
      })
      .from(thesisVersions)
      .innerJoin(theses, eq(theses.id, thesisVersions.thesisId))
      .leftJoin(runs, eq(runs.id, thesisVersions.runId))
      .orderBy(desc(thesisVersions.createdAt), desc(thesisVersions.version)),
    loadLatestScreen(db),
  ]);

  const fundRows = rows.filter(
    (row) => row.scope === "fund" && row.status !== "closed",
  );
  const newestFund = fundRows.at(0);
  const fundBody =
    newestFund === undefined
      ? null
      : fundThesisSchema.safeParse(newestFund.body);

  const seen = new Set<string>();
  const positions: PositionThesisView[] = [];
  for (const row of rows) {
    if (row.scope !== "position" || row.symbol === null) continue;
    if (seen.has(row.thesisId)) continue;
    seen.add(row.thesisId);
    const body = positionThesisSchema.safeParse(row.body);
    if (!body.success) continue;
    positions.push({
      id: row.thesisId,
      symbol: row.symbol,
      name: nameOf.get(row.symbol) ?? row.symbol,
      status: row.status,
      version: row.version,
      decidedOn: decidedOn(row),
      changeNote: row.changeNote,
      body: body.data,
    });
  }

  return {
    fund:
      newestFund === undefined || fundBody === null || !fundBody.success
        ? null
        : {
            body: fundBody.data,
            version: newestFund.version,
            decidedOn: decidedOn(newestFund),
            runId: newestFund.runId,
          },
    fundVersions: fundRows
      .filter((row) => row.thesisId === newestFund?.thesisId)
      .map((row) => ({
        version: row.version,
        decidedOn: decidedOn(row),
        changeNote: row.changeNote,
        runId: row.runId,
      })),
    positions,
    screen:
      screen === null
        ? null
        : {
            asOf: screen.result.asOf,
            runId: screen.runId,
            screened: screen.result.rows.length,
            shortlist: screen.result.shortlist.map((row) => ({
              symbol: row.symbol,
              sector: row.sector,
              composite: row.composite,
              percentiles: row.percentiles,
              name: nameOf.get(row.symbol) ?? row.symbol,
            })),
          },
  };
}
