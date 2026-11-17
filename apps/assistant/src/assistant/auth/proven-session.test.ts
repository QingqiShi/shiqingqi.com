import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { provenSession, provenUserId } from "./proven-session.ts";
import type { AssistantSession } from "./types.ts";

describe("a proven session", () => {
  const userId = randomUUID();
  const session = provenSession({ sessionId: "session", userId });

  it("gives its user", () => {
    expect(provenUserId(session)).toBe(userId);
  });

  it("refuses an object that only says it is a session", () => {
    const forgeries: AssistantSession[] = [
      z.custom<AssistantSession>().parse({ sessionId: "s", userId }),
      z.custom<AssistantSession>().parse(JSON.parse(JSON.stringify(session))),
      structuredClone(session),
    ];
    for (const forged of forgeries) {
      expect(() => provenUserId(forged)).toThrow(/not a session/);
    }
  });

  it("cannot be made again through its constructor", () => {
    expect(() => {
      Reflect.construct(session.constructor, ["session", randomUUID()]);
    }).toThrow();
  });

  it("cannot be given another user", () => {
    expect(() =>
      Object.defineProperty(session, "userId", { value: randomUUID() }),
    ).toThrow();
    expect(provenUserId(session)).toBe(userId);
    expect(session.userId).toBe(userId);
  });
});
