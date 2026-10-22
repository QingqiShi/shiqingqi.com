import { describe, expect, it } from "vitest";
import { payeeNameCandidates } from "./payee-name-candidates.ts";

describe("payeeNameCandidates", () => {
  it("cuts names from the bank text in normal capitalisation, without numbers, codes or card words", () => {
    expect(payeeNameCandidates("", "TESCO STORES 2210")).toEqual([
      "Tesco Stores",
      "Tesco",
      "Stores",
    ]);
    expect(payeeNameCandidates("", "AMAZON PRIME*2K4LM")).toEqual([
      "Amazon Prime",
      "Amazon",
      "Prime",
    ]);
    expect(
      payeeNameCandidates("", "CARD PAYMENT TO DELIVEROO ON 03 OCT"),
    ).toEqual([
      "Card Payment to Deliveroo",
      "Payment to Deliveroo",
      "Deliveroo",
    ]);
    expect(payeeNameCandidates("", "M&S SIMPLY FOOD").slice(0, 1)).toEqual([
      "M&S Simply Food",
    ]);
    expect(payeeNameCandidates("", "MARKS & SPENCER 2")).toEqual([
      "Marks & Spencer",
      "Marks",
      "Spencer",
    ]);
  });

  it("offers a domain and its name", () => {
    expect(payeeNameCandidates("", "BOOKING.COM HOTEL")).toEqual([
      "Booking.com",
      "Booking Hotel",
      "Booking",
      "Hotel",
    ]);
    expect(payeeNameCandidates("", "WWW.EBAY.CO.UK")).toEqual([
      "Ebay.co.uk",
      "Ebay",
    ]);
  });

  it("puts a merchant the bank wrote in normal case first, and gives each name once", () => {
    expect(payeeNameCandidates("Pret A Manger", "PRET A MANGER 123")).toEqual([
      "Pret A Manger",
      "Pret A",
      "A Manger",
      "Pret",
      "Manger",
    ]);
  });
});
