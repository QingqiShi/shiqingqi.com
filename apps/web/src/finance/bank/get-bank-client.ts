import "server-only";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import { buildFakeBankFixture } from "./build-fake-bank-fixture.ts";
import { createFakeBankClient } from "./lunchflow/create-fake-bank-client.ts";
import { createLunchFlowClient } from "./lunchflow/create-lunch-flow-client.ts";
import type { BankConnection } from "./types.ts";

/**
 * The bank provider of a Household. `FINANCE_LUNCHFLOW_MODE=fake` gives a
 * fake bank built from the Household's own data (dev and e2e); else
 * `LUNCH_FLOW_API_KEY` gives the real Lunch Flow client; else the Household
 * is not connected.
 */
export async function getBankClient(
  scope: RepositoryScope,
  now: Date,
): Promise<BankConnection> {
  if (process.env.FINANCE_LUNCHFLOW_MODE === "fake") {
    const household = await householdRepository.find(scope);
    const today = todayInTimeZone(
      household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
      now,
    );
    return {
      status: "connected",
      mode: "fake",
      client: createFakeBankClient(await buildFakeBankFixture(scope, today)),
    };
  }
  const apiKey = process.env.LUNCH_FLOW_API_KEY;
  if (apiKey) {
    return {
      status: "connected",
      mode: "real",
      client: createLunchFlowClient({ apiKey }),
    };
  }
  return { status: "not_connected" };
}
