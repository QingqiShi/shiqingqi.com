import { expect, test } from "vitest";
import { firstRunStage } from "./first-run-stage.ts";

test("waits for a Mac, then for its first upload, then shows the pet", () => {
  expect(firstRunStage(0, null)).toBe("waiting-mac");
  expect(firstRunStage(1, null)).toBe("waiting-data");
  expect(firstRunStage(1, 1_700_000_000_000)).toBeNull();
});

test("a pet whose Macs were all disconnected stays on the page", () => {
  expect(firstRunStage(0, 1_700_000_000_000)).toBeNull();
});
