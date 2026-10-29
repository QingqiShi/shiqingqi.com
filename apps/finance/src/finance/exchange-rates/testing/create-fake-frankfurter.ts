import { addDays } from "../../domain/dates/add-days.ts";

export interface FakeFrankfurter {
  fetch: typeof fetch;
  requests: string[];
  /** The rate of each pair by `base/quote`, the same on every day. A pair without one answers 404. */
  rates: Map<string, number>;
  /** By `base/quote`: a status to answer with, or an error to throw. */
  failures: Map<string, number | Error>;
}

function isWeekend(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/**
 * A Frankfurter that, like the real one, publishes on weekdays only and
 * starts a series at the last weekday on or before its start.
 */
export function createFakeFrankfurter(): FakeFrankfurter {
  const fake: FakeFrankfurter = {
    requests: [],
    rates: new Map(),
    failures: new Map(),
    fetch: (input) => {
      const url = new URL(input instanceof Request ? input.url : input);
      fake.requests.push(url.toString());
      const [start, end] = (url.pathname.split("/").at(-1) ?? "").split("..");
      const base = url.searchParams.get("base") ?? "";
      const quote = url.searchParams.get("symbols") ?? "";
      const failure = fake.failures.get(`${base}/${quote}`);
      if (failure instanceof Error) return Promise.reject(failure);
      if (failure !== undefined) {
        return Promise.resolve(new Response("{}", { status: failure }));
      }
      const rate = fake.rates.get(`${base}/${quote}`);
      if (rate === undefined) {
        return Promise.resolve(
          Response.json({ message: "not found" }, { status: 404 }),
        );
      }
      let first = start;
      while (isWeekend(first)) first = addDays(first, -1);
      const rates: Record<string, Record<string, number>> = {};
      for (let day = first; day <= end; day = addDays(day, 1)) {
        if (!isWeekend(day)) rates[day] = { [quote]: rate };
      }
      return Promise.resolve(
        Response.json({
          amount: 1,
          base,
          start_date: first,
          end_date: end,
          rates,
        }),
      );
    },
  };
  return fake;
}
