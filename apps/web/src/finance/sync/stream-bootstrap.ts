import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { readSnapshot, readTable } from "./pull-changes.ts";
import { SYNC_TABLE_NAMES } from "./row-schemas.ts";

const ROWS_PER_LINE = 1000;

/**
 * The whole Replica of a Household as NDJSON (see `BootstrapLine`): a
 * `start` line, then the rows table by table in lines of up to 1,000, then an
 * `end` line. Everything comes from one snapshot.
 */
export function streamBootstrap(db: FinanceDb, householdId: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: object) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      };
      try {
        await readSnapshot(db, householdId, async (scope) => {
          const household = await householdRepository.find(scope);
          if (!household) throw new Error("Household not found");
          send({ type: "start", clock: household.clock, household });
          for (const table of SYNC_TABLE_NAMES) {
            const rows = await readTable(scope, table, null);
            for (let i = 0; i < rows.length; i += ROWS_PER_LINE) {
              send({
                type: "rows",
                table,
                rows: rows.slice(i, i + ROWS_PER_LINE),
              });
            }
          }
          send({ type: "end", clock: household.clock });
        });
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
