import { describe, expect, it } from "vitest";
import { redactTokens } from "./redact-tokens";

const token = "q3J0Zk1xV2t0bE9fYlR5c0pXeGh2Q0VyM2lNRFZ3b0s";
const hexToken = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822c";

describe("redactTokens", () => {
  it("replaces the token in a token page path", () => {
    expect(redactTokens(`https://trips.qingqi.dev/zh/recover/${token}`)).toBe(
      "https://trips.qingqi.dev/zh/recover/[token]",
    );
  });

  it("replaces a token after a percent escape and keeps the escape", () => {
    expect(
      redactTokens(
        `https://finance.qingqi.dev/sign-in?next=%2Finvite%2F${token}`,
      ),
    ).toBe("https://finance.qingqi.dev/sign-in?next=%2Finvite%2F[token]");
  });

  it("replaces a token in a query value and in a hash", () => {
    expect(redactTokens(`/connect?token=${hexToken}#${token}`)).toBe(
      "/connect?token=[token]#[token]",
    );
  });

  it("keeps a long slug, and an ordinary query and hash", () => {
    const url =
      "https://qingqi.dev/zh/education/altrincham-grammar-school-for-boys?q=the+matrix&page=2#day-1";
    expect(redactTokens(url)).toBe(url);
  });
});
