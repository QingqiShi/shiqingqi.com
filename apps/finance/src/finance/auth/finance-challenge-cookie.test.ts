import { describe, expect, it } from "vitest";
import { financeChallengeCookie } from "./finance-challenge-cookie.ts";

const now = new Date("2026-10-10T12:00:00Z");
const payload = { purpose: "sign-in", challenge: "abc" } as const;

describe("financeChallengeCookie", () => {
  it("opens what it sealed within five minutes", () => {
    const sealed = financeChallengeCookie.seal(payload, "secret", now);

    expect(financeChallengeCookie.open(sealed, "secret", now)).toEqual(payload);
    expect(
      financeChallengeCookie.open(
        sealed,
        "secret",
        new Date(now.getTime() + 5 * 60 * 1000),
      ),
    ).toBeNull();
  });

  it("rejects another secret or a changed payload", () => {
    const sealed = financeChallengeCookie.seal(payload, "secret", now);
    const [, signature] = sealed.split(".");
    const forged = `${Buffer.from(
      JSON.stringify({ payload: { ...payload, challenge: "xyz" }, exp: 9e15 }),
    ).toString("base64url")}.${signature}`;

    expect(financeChallengeCookie.open(sealed, "other", now)).toBeNull();
    expect(financeChallengeCookie.open(forged, "secret", now)).toBeNull();
    expect(financeChallengeCookie.open("garbage", "secret", now)).toBeNull();
  });
});
