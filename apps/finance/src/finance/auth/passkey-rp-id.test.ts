import { describe, expect, it } from "vitest";
import { passkeyRpId } from "./passkey-rp-id.ts";

describe("passkeyRpId", () => {
  it("keeps the passkeys made on qingqi.dev usable on its subdomains", () => {
    expect(passkeyRpId("finance.qingqi.dev")).toBe("qingqi.dev");
    expect(passkeyRpId("qingqi.dev")).toBe("qingqi.dev");
  });

  it("uses the host itself everywhere else", () => {
    expect(passkeyRpId("localhost")).toBe("localhost");
    expect(passkeyRpId("finance-abc.vercel.app")).toBe(
      "finance-abc.vercel.app",
    );
    expect(passkeyRpId("notqingqi.dev")).toBe("notqingqi.dev");
  });
});
