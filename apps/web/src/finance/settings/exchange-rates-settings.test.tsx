import { describe, expect, it } from "vitest";
import { screen } from "#src/testing/test-utils.tsx";
import {
  createTestReplica,
  testReplicaRows,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { ExchangeRatesSettings } from "./exchange-rates-settings.tsx";
import { createSettingsReplica } from "./testing/create-settings-replica.ts";

describe("ExchangeRatesSettings", () => {
  it("shows the latest rate of each foreign currency, its source and its day, with nothing to edit", async () => {
    const runtime = await createSettingsReplica();
    renderWithReplica(runtime, <ExchangeRatesSettings />);

    expect(screen.getByText("1 USD = 0.75 GBP")).toBeVisible();
    expect(
      screen.getByText(/^From your records · 1 Sept( 2026)? · 1 account$/),
    ).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says a currency with no rate yet counts one to one", async () => {
    const runtime = await createTestReplica(testReplicaRows(), []);
    renderWithReplica(runtime, <ExchangeRatesSettings />);

    expect(screen.getByText("USD")).toBeVisible();
    expect(
      screen.getByText(
        /^Counts one to one until a rate arrives, within a day · /,
      ),
    ).toBeVisible();
  });
});
