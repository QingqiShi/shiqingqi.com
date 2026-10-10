import { describe, expect, it } from "vitest";
import { isTaxRefund } from "./is-tax-refund.ts";

describe("isTaxRefund", () => {
  it("finds HMRC as a word in any case, or 退税", () => {
    expect(isTaxRefund("HMRC")).toBe(true);
    expect(isTaxRefund("Tesco hmrc self assessment")).toBe(true);
    expect(isTaxRefund("工资 退税")).toBe(true);
  });

  it("ignores HMRC inside another word and other refunds", () => {
    expect(isTaxRefund("xhmrcpay")).toBe(false);
    expect(isTaxRefund("Ocado refund")).toBe(false);
    expect(isTaxRefund("退款")).toBe(false);
  });
});
