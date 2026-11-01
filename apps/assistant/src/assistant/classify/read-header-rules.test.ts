import { describe, expect, it } from "vitest";
import { matchSenderRule } from "./match-sender-rule.ts";
import { readHeaderRules, type MailForRules } from "./read-header-rules.ts";
import type { SenderRule } from "./types.ts";

const plain: MailForRules = {
  fromAddress: "shop@example.com",
  subject: "Your order has shipped",
  snippet: "Order 20261101 is on its way.",
  listId: null,
  listUnsubscribe: null,
  autoSubmitted: null,
  precedence: null,
};

function rulesOf(mail: Partial<MailForRules>) {
  return readHeaderRules({ ...plain, ...mail });
}

describe("readHeaderRules", () => {
  it("decides a one-time code without the model, in English and Chinese", () => {
    expect(
      rulesOf({
        subject: "Your verification code",
        snippet: "Use 482 913 to sign in. It expires in 10 minutes.",
      }).rule,
    ).toBe("one-time-code");
    expect(
      rulesOf({
        subject: "【招商银行】",
        snippet: "您的验证码为630211，5分钟内有效，请勿泄露。",
      }).rule,
    ).toBe("one-time-code");
  });

  it("does not take a number far from the words for a code", () => {
    const { rule, signals } = rulesOf({
      subject: "November newsletter",
      snippet: `Never share a verification code with anyone.${" Tips.".repeat(40)} Order 482913 ships soon.`,
    });
    expect(rule).toBeNull();
    expect(signals.oneTimeCode).toBe(false);
  });

  it("decides an auto-reply without the model", () => {
    expect(rulesOf({ autoSubmitted: "auto-replied" }).rule).toBe("auto-reply");
    expect(rulesOf({ subject: "自动回复：会议安排" }).rule).toBe("auto-reply");
  });

  it("leaves other mail to the model, with its signals", () => {
    expect(rulesOf({}).rule).toBeNull();
    expect(
      rulesOf({ listUnsubscribe: "<mailto:u@example.com>" }).signals.bulk,
    ).toBe(true);
    expect(rulesOf({ precedence: "Bulk" }).signals.bulk).toBe(true);
    expect(rulesOf({ autoSubmitted: "auto-generated" }).signals.automated).toBe(
      true,
    );
    expect(rulesOf({ autoSubmitted: "no" }).signals.automated).toBe(false);
    expect(
      rulesOf({ subject: "Security alert: new sign-in on Mac" }).signals
        .securityAlert,
    ).toBe(true);
    expect(rulesOf({ subject: "账号异地登录提醒" }).signals.securityAlert).toBe(
      true,
    );
  });
});

describe("matchSenderRule", () => {
  const rule = (match: SenderRule["match"], pattern: string): SenderRule => ({
    id: `${match}:${pattern}`,
    match,
    pattern,
    bucket: "filed",
    categoryId: null,
  });
  const rules = [
    rule("domain", "example.com"),
    rule("domain", "mail.example.com"),
    rule("address", "boss@example.com"),
  ];

  it("prefers the address, then the longest domain, and matches subdomains", () => {
    expect(matchSenderRule("Boss@Example.com", rules)?.id).toBe(
      "address:boss@example.com",
    );
    expect(matchSenderRule("news@mail.example.com", rules)?.id).toBe(
      "domain:mail.example.com",
    );
    expect(matchSenderRule("a@eu.example.com", rules)?.id).toBe(
      "domain:example.com",
    );
  });

  it("does not match a domain that only ends in the same letters", () => {
    expect(matchSenderRule("a@notexample.com", rules)).toBeNull();
    expect(matchSenderRule(null, rules)).toBeNull();
  });
});
