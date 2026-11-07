import { describe, expect, it } from "vitest";
import {
  makeMailImageLinks,
  openMailImageLink,
} from "./make-mail-image-links.ts";

const SECRET = "test-auth-secret";
const MADE_AT = new Date("2026-11-07T10:20:00Z");
const IMAGE = "https://images.example/logo.png?id=1&size=2";

function paramsOf(link: string) {
  return new URL(link).searchParams;
}

describe("mail image links", () => {
  const link = makeMailImageLinks(
    "https://assistant.example",
    SECRET,
    MADE_AT,
  ).link(IMAGE);

  it("opens a link it signed until it expires", () => {
    expect(openMailImageLink(paramsOf(link), SECRET, MADE_AT)?.url).toBe(IMAGE);
    expect(
      openMailImageLink(
        paramsOf(link),
        SECRET,
        new Date("2026-11-07T17:00:00Z"),
      ),
    ).toBeNull();
  });

  it("refuses a link whose URL or expiry was changed, or that another secret signed", () => {
    const otherUrl = paramsOf(link);
    otherUrl.set(
      "u",
      Buffer.from("http://169.254.169.254/").toString("base64url"),
    );
    const laterExpiry = paramsOf(link);
    laterExpiry.set("e", String(Number(laterExpiry.get("e")) + 3600));

    expect(openMailImageLink(otherUrl, SECRET, MADE_AT)).toBeNull();
    expect(openMailImageLink(laterExpiry, SECRET, MADE_AT)).toBeNull();
    expect(
      openMailImageLink(paramsOf(link), "other-secret", MADE_AT),
    ).toBeNull();
  });
});
