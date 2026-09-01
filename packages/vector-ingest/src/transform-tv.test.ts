import { describe, it, expect } from "vitest";
import { makeTvDetail } from "./test-fixtures.ts";
import { transformTv } from "./transform-tv.ts";

describe("transformTv", () => {
  it("produces correct VectorRecord", () => {
    const record = transformTv(makeTvDetail());
    expect(record.id).toBe("tv-1396");
    expect(record.data).toContain("Breaking Bad");
    expect(record.metadata.mediaType).toBe("tv");
    expect(record.metadata.title).toBe("Breaking Bad");
    expect(record.metadata.releaseYear).toBe(2008);
  });
});
