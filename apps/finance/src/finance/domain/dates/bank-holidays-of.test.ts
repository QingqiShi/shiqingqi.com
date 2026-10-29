import { describe, expect, it } from "vitest";
import {
  GOV_UK_BANK_HOLIDAYS,
  GOV_UK_BANK_HOLIDAYS_YEARS,
} from "../../testing/gov-uk-bank-holidays.ts";
import { bankHolidaysOf } from "./bank-holidays-of.ts";

describe("bankHolidaysOf", () => {
  it("matches the gov.uk England and Wales list year by year", () => {
    const { from, to } = GOV_UK_BANK_HOLIDAYS_YEARS;
    for (let year = from; year <= to; year++) {
      expect([...bankHolidaysOf(year)].sort(), String(year)).toEqual(
        GOV_UK_BANK_HOLIDAYS.filter((day) => day.startsWith(String(year))),
      );
    }
  });
});
