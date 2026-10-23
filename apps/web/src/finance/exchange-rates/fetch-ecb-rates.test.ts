import { describe, expect, it } from "vitest";
import { fetchEcbRates } from "./fetch-ecb-rates.ts";

const PAIR = { base: "CNY", quote: "GBP" };

function answering(response: Response) {
  const requests: { url: string; accept: string | null }[] = [];
  const request: typeof fetch = (input, init) => {
    requests.push({
      url: input instanceof Request ? input.url : input.toString(),
      accept: new Headers(init?.headers).get("Accept"),
    });
    return Promise.resolve(response);
  };
  return { request, requests };
}

describe("fetchEcbRates", () => {
  it("asks Frankfurter for the range and reads its answer into rows", async () => {
    const { request, requests } = answering(
      Response.json({
        amount: 1.0,
        base: "CNY",
        start_date: "2026-10-16",
        end_date: "2026-10-22",
        rates: {
          "2026-10-16": { GBP: 0.11215 },
          "2026-10-19": { GBP: 0.11229 },
        },
      }),
    );

    const rows = await fetchEcbRates(request, PAIR, "2026-10-17", "2026-10-22");

    expect(requests).toEqual([
      {
        url: "https://api.frankfurter.dev/v1/2026-10-17..2026-10-22?base=CNY&symbols=GBP",
        accept: "application/json",
      },
    ]);
    expect(rows).toEqual([
      {
        base: "CNY",
        quote: "GBP",
        on: "2026-10-16",
        rate: 0.11215,
        source: "ecb",
      },
      {
        base: "CNY",
        quote: "GBP",
        on: "2026-10-19",
        rate: 0.11229,
        source: "ecb",
      },
    ]);
  });

  it("drops a day after the end and a day without the quote currency", async () => {
    const { request } = answering(
      Response.json({
        amount: 1.0,
        base: "CNY",
        start_date: "2026-10-21",
        end_date: "2026-10-23",
        rates: {
          "2026-10-21": { USD: 0.14 },
          "2026-10-22": { GBP: 0.1123 },
          "2026-10-23": { GBP: 0.1124 },
        },
      }),
    );

    const rows = await fetchEcbRates(request, PAIR, "2026-10-21", "2026-10-22");

    expect(rows.map((row) => row.on)).toEqual(["2026-10-22"]);
  });

  it("gives no rows when Frankfurter answers 404", async () => {
    const { request } = answering(
      Response.json({ message: "not found" }, { status: 404 }),
    );

    expect(
      await fetchEcbRates(request, PAIR, "2026-10-21", "2026-10-22"),
    ).toEqual([]);
  });

  it("throws when Frankfurter answers with another error", async () => {
    const { request } = answering(new Response("oops", { status: 500 }));

    await expect(
      fetchEcbRates(request, PAIR, "2026-10-21", "2026-10-22"),
    ).rejects.toThrow("Frankfurter answered 500 for CNY/GBP");
  });
});
