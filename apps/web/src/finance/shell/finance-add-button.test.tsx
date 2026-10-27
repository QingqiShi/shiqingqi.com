import { describe, expect, it } from "vitest";
import { screen } from "#src/testing/test-utils.tsx";
import {
  createTestReplica,
  TEST_IDS,
} from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { FinanceAddButton } from "./finance-add-button.tsx";

const ids = TEST_IDS;

describe("FinanceAddButton", () => {
  it("links to a new expense over the screen it is on", async () => {
    const runtime = await createTestReplica();
    renderWithReplica(runtime, <FinanceAddButton />, {
      pathname: "/finance",
      search: `account=${ids.card}`,
    });
    expect(screen.getByRole("link", { name: "Add" })).toHaveAttribute(
      "href",
      `/finance?account=${ids.card}&new=expense`,
    );
  });
});
