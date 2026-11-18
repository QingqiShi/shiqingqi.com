import { expect, it } from "vitest";
import { describeError } from "./describe-error.ts";

it("describes an error by its names and codes, without its messages", () => {
  const marker = "secret-trip-note-7f3a";
  const error = new Error(`Failed: ${marker}`, {
    cause: Object.assign(new Error(`invalid input: "${marker}"`), {
      code: "22P02",
    }),
  });

  const described = describeError(error);
  expect(described).not.toContain(marker);
  expect(described).toContain("22P02");
});
