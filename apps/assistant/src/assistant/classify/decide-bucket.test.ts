import { describe, expect, it } from "vitest";
import { decideBucket, type BucketInput } from "./decide-bucket.ts";
import type { HeaderSignals } from "./read-header-rules.ts";
import type { MailFacts } from "./types.ts";

const routine: MailFacts = {
  category: "Shopping",
  asksUserToAct: "no",
  personal: "no",
  marketing: "no",
  worthKnowing: "no",
  securityAlert: "no",
  oneTimeCode: "no",
  dueDate: null,
};
const noSignals: HeaderSignals = {
  bulk: false,
  automated: false,
  securityAlert: false,
  oneTimeCode: false,
};

function bucketOf({
  facts = {},
  signals = {},
  knownCorrespondent = false,
  senderRule = null,
}: {
  facts?: Partial<MailFacts>;
  signals?: Partial<HeaderSignals>;
  knownCorrespondent?: boolean;
  senderRule?: BucketInput["senderRule"];
}) {
  return decideBucket({
    facts: { ...routine, ...facts },
    signals: { ...noSignals, ...signals },
    knownCorrespondent,
    senderRule,
  }).bucket;
}

describe("decideBucket", () => {
  it("files routine mail and marketing, even marketing that asks to act", () => {
    expect(bucketOf({})).toBe("filed");
    expect(
      bucketOf({ facts: { marketing: "yes", asksUserToAct: "yes" } }),
    ).toBe("filed");
  });

  it("makes mail that asks the user to act `act`", () => {
    expect(bucketOf({ facts: { asksUserToAct: "yes" } })).toBe("act");
  });

  it("makes personal mail and mail worth knowing `fyi`", () => {
    expect(bucketOf({ facts: { personal: "yes" } })).toBe("fyi");
    expect(bucketOf({ facts: { worthKnowing: "yes" } })).toBe("fyi");
  });

  it("makes mail `unsure` when a key fact is unclear", () => {
    for (const fact of [
      "asksUserToAct",
      "marketing",
      "personal",
      "worthKnowing",
    ] as const) {
      expect(bucketOf({ facts: { [fact]: "unclear" } }), fact).toBe("unsure");
    }
  });

  it("makes mail `unsure` when it would be filed without a clear category", () => {
    expect(bucketOf({ facts: { category: "unclear" } })).toBe("unsure");
    expect(bucketOf({ facts: { category: "none" } })).toBe("filed");
    expect(
      bucketOf({ facts: { category: "unclear", asksUserToAct: "yes" } }),
    ).toBe("act");
  });

  it("does not believe that mail to a list or from a machine is personal", () => {
    expect(
      bucketOf({ facts: { personal: "yes" }, signals: { bulk: true } }),
    ).toBe("filed");
    expect(
      bucketOf({
        facts: { personal: "unclear" },
        signals: { automated: true },
      }),
    ).toBe("filed");
  });

  it("never files a security alert or a one-time code, whatever the model or a sender rule says", () => {
    expect(bucketOf({ signals: { securityAlert: true } })).toBe("fyi");
    expect(
      bucketOf({ facts: { securityAlert: "yes", marketing: "yes" } }),
    ).toBe("fyi");
    expect(bucketOf({ facts: { oneTimeCode: "yes" } })).toBe("fyi");
    expect(
      bucketOf({
        signals: { oneTimeCode: true },
        senderRule: { bucket: "filed" },
      }),
    ).toBe("fyi");
  });

  it("never files mail from a sender the user has replied to, unless a sender rule says so", () => {
    expect(bucketOf({ knownCorrespondent: true })).toBe("fyi");
    expect(
      bucketOf({ facts: { marketing: "yes" }, knownCorrespondent: true }),
    ).toBe("fyi");
    expect(
      bucketOf({ knownCorrespondent: true, senderRule: { bucket: "filed" } }),
    ).toBe("filed");
  });

  it("follows a sender rule over unclear facts", () => {
    expect(
      bucketOf({
        facts: { asksUserToAct: "unclear" },
        senderRule: { bucket: "filed" },
      }),
    ).toBe("filed");
    expect(bucketOf({ senderRule: { bucket: "act" } })).toBe("act");
  });
});
