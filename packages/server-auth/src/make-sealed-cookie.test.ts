import { describe, expect, it } from "vitest";
import { z } from "zod";
import { makeSealedCookie } from "./make-sealed-cookie.ts";

const now = new Date("2026-10-10T12:00:00Z");
const schema = z.object({ challenge: z.string() });
const payload = { challenge: "abc" };
const cookie = makeSealedCookie({
  name: "app_challenge",
  maxAgeSeconds: 5 * 60,
  schema,
});

describe("makeSealedCookie", () => {
  it("opens what it sealed until the max age", () => {
    const sealed = cookie.seal(payload, "secret", now);

    expect(cookie.open(sealed, "secret", now)).toEqual(payload);
    expect(
      cookie.open(sealed, "secret", new Date(now.getTime() + 5 * 60 * 1000)),
    ).toBeNull();
  });

  it("rejects another secret, a changed payload and another cookie's value", () => {
    const sealed = cookie.seal(payload, "secret", now);
    const [, signature] = sealed.split(".");
    const forged = `${Buffer.from(
      JSON.stringify({ payload: { challenge: "xyz" }, exp: 9e15 }),
    ).toString("base64url")}.${signature}`;
    const other = makeSealedCookie({
      name: "app_other",
      maxAgeSeconds: 5 * 60,
      schema,
    });

    expect(cookie.open(sealed, "other", now)).toBeNull();
    expect(cookie.open(forged, "secret", now)).toBeNull();
    expect(cookie.open("garbage", "secret", now)).toBeNull();
    expect(other.open(sealed, "secret", now)).toBeNull();
  });
});
