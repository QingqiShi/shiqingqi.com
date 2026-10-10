import { describe, expect, it } from "vitest";
import { waitFor } from "#src/testing/test-utils.tsx";
import { selectAnalyticsIndex } from "../analytics/select-analytics-index.ts";
import { createTestReplica } from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { PrewarmScreens } from "./prewarm-screens.tsx";

const INDEX_BUILT = "finance:analytics-index";

describe("PrewarmScreens", () => {
  it("builds the analytics index in idle time, so the screen finds it ready", async () => {
    const runtime = await createTestReplica();
    performance.clearMeasures(INDEX_BUILT);

    renderWithReplica(runtime, <PrewarmScreens />);
    expect(performance.getEntriesByName(INDEX_BUILT)).toHaveLength(0);
    await waitFor(() => {
      expect(performance.getEntriesByName(INDEX_BUILT)).toHaveLength(1);
    });

    selectAnalyticsIndex(
      runtime.store.getSnapshot(),
      runtime.store.getMeta().transactionsFrom,
    );
    expect(performance.getEntriesByName(INDEX_BUILT)).toHaveLength(1);
  });
});
