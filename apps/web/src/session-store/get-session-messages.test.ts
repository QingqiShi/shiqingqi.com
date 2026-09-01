import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRedis = {
  get: vi.fn(() => null),
  set: vi.fn(),
};

vi.mock("./get-redis-client", () => ({
  getRedisClient: () => mockRedis,
}));

import { getSessionMessages } from "./get-session-messages";

describe("getSessionMessages", () => {
  it("returns null for a non-existent session", async () => {
    const result = await getSessionMessages("non-existent-id");
    expect(result).toBeNull();
  });
});
