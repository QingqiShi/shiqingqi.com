import { describe, expect, it } from "vitest";
import { currencyExponent } from "./currency-exponent.ts";
import { formatMoney } from "./format-money.ts";
import { parseMoney } from "./parse-money.ts";
import {
  fromMinorUnits,
  minorUnitsToDecimalString,
  toMinorUnits,
} from "./to-minor-units.ts";

describe("currencyExponent", () => {
  it.each([
    ["GBP", 2],
    ["CNY", 2],
    ["USD", 2],
    ["EUR", 2],
    ["JPY", 0],
    ["KWD", 3],
  ])("gives %s %i decimal places", (currency, exponent) => {
    expect(currencyExponent(currency)).toBe(exponent);
  });

  it("refuses a code that is not a currency", () => {
    expect(() => currencyExponent("POUNDS")).toThrow(RangeError);
  });
});

describe("toMinorUnits", () => {
  it.each([
    [12.5, "GBP", 1250],
    [0.1 + 0.2, "GBP", 30],
    [1234567.89, "GBP", 123456789],
    [-3.2, "GBP", -320],
    [1234, "JPY", 1234],
    [1.2345, "KWD", 1234],
    ["12.50", "GBP", 1250],
    [".5", "GBP", 50],
    ["5.", "GBP", 500],
    ["-0.00", "GBP", 0],
  ])("reads %s %s as %i", (major, currency, minor) => {
    expect(toMinorUnits(major, currency)).toBe(minor);
  });

  it("rounds half to even at the currency exponent", () => {
    expect(toMinorUnits(12.345, "GBP")).toBe(1234);
    expect(toMinorUnits(12.355, "GBP")).toBe(1236);
    expect(toMinorUnits("12.3450001", "GBP")).toBe(1235);
    expect(toMinorUnits(-12.345, "GBP")).toBe(-1234);
    expect(toMinorUnits(0.001, "GBP")).toBe(0);
    expect(toMinorUnits(0.5, "JPY")).toBe(0);
    expect(toMinorUnits(1.5, "JPY")).toBe(2);
  });

  it("reads numbers in exponent notation", () => {
    expect(toMinorUnits(1e-7, "GBP")).toBe(0);
    expect(toMinorUnits(1.5e-2, "GBP")).toBe(2);
  });

  it("refuses text that is not a decimal amount", () => {
    expect(() => toMinorUnits("12,50", "GBP")).toThrow(SyntaxError);
    expect(() => toMinorUnits("", "GBP")).toThrow(SyntaxError);
    expect(() => toMinorUnits(".", "GBP")).toThrow(SyntaxError);
    expect(() => toMinorUnits(Number.NaN, "GBP")).toThrow(RangeError);
  });

  it("refuses an amount beyond exact integers", () => {
    expect(() => toMinorUnits("900000000000000000", "GBP")).toThrow(RangeError);
  });
});

describe("fromMinorUnits and minorUnitsToDecimalString", () => {
  it("convert minor units back to major units", () => {
    expect(fromMinorUnits(123456, "GBP")).toBe(1234.56);
    expect(fromMinorUnits(1234, "JPY")).toBe(1234);
    expect(minorUnitsToDecimalString(-123456, "GBP")).toBe("-1234.56");
    expect(minorUnitsToDecimalString(5, "GBP")).toBe("0.05");
    expect(minorUnitsToDecimalString(-5, "KWD")).toBe("-0.005");
    expect(minorUnitsToDecimalString(1234, "JPY")).toBe("1234");
    expect(minorUnitsToDecimalString(0, "GBP")).toBe("0.00");
  });
});

describe("formatMoney", () => {
  it("formats with the currency's own decimal places", () => {
    expect(formatMoney(123450, "GBP", "en")).toBe("£1,234.50");
    expect(formatMoney(-320, "GBP", "en")).toBe("-£3.20");
    expect(formatMoney(1234, "JPY", "en")).toBe("¥1,234");
    expect(formatMoney(123456789, "GBP", "zh")).toBe("£1,234,567.89");
    expect(formatMoney(1250, "CNY", "zh")).toBe("¥12.50");
  });

  it("shows a sign on money in when asked", () => {
    expect(formatMoney(500, "GBP", "en", { signDisplay: "exceptZero" })).toBe(
      "+£5.00",
    );
    expect(formatMoney(0, "GBP", "en", { signDisplay: "exceptZero" })).toBe(
      "£0.00",
    );
  });

  it("shows the code instead of the symbol when asked", () => {
    expect(
      formatMoney(500, "GBP", "en", { currencyDisplay: "code" }).replaceAll(
        " ",
        " ",
      ),
    ).toBe("GBP 5.00");
  });

  it("formats compact amounts for chart axes", () => {
    expect(formatMoney(123456789, "GBP", "en", { notation: "compact" })).toBe(
      "£1.2M",
    );
  });
});

describe("parseMoney", () => {
  it.each([
    ["12.5", 1250],
    ["12", 1200],
    ["0.05", 5],
    [".5", 50],
    ["1,234.56", 123456],
    ["1,234,567", 123456700],
    ["£3", 300],
    ["£ 3.20", 320],
    ["-£3.20", -320],
    ["£-3.20", -320],
    ["−3.20", -320],
    ["+12", 1200],
    ["GBP 12", 1200],
    ["12 gbp", 1200],
    ["１２．５", 1250],
    ["  12.50  ", 1250],
  ])("reads %j as %i", (input, minor) => {
    expect(parseMoney(input, "GBP")).toBe(minor);
  });

  it.each([
    "",
    "£",
    "abc",
    "12,5",
    "1,23.45",
    "12.345",
    "1.2.3",
    "12a",
    "--12",
    ".",
  ])("refuses %j", (input) => {
    expect(parseMoney(input, "GBP")).toBeNull();
  });

  it("follows the currency's decimal places", () => {
    expect(parseMoney("¥1,234", "JPY")).toBe(1234);
    expect(parseMoney("1234.5", "JPY")).toBeNull();
    expect(parseMoney("1.234", "KWD")).toBe(1234);
  });
});
