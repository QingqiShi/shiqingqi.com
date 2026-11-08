import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  nextOrganiseAt,
  ORGANISE_INTERVAL_MINUTES,
} from "./next-organise-at.ts";

const next = (now: string) => nextOrganiseAt(new Date(now)).toISOString();

describe("nextOrganiseAt", () => {
  it("is strictly after now, also on a half hour", () => {
    expect(next("2026-11-02T10:30:00.000Z")).toBe("2026-11-02T11:00:00.000Z");
    expect(next("2026-11-02T10:29:59.999Z")).toBe("2026-11-02T10:30:00.000Z");
  });

  it("goes over the hour and the day", () => {
    expect(next("2026-11-02T23:30:00.001Z")).toBe("2026-11-03T00:00:00.000Z");
  });

  it("matches the organise cron in vercel.json", () => {
    const { crons } = z
      .object({
        crons: z.array(z.object({ path: z.string(), schedule: z.string() })),
      })
      .parse(
        JSON.parse(
          readFileSync(
            path.join(import.meta.dirname, "../../../vercel.json"),
            "utf8",
          ),
        ),
      );
    expect(
      crons.find((cron) => cron.path === "/api/cron/organise")?.schedule,
    ).toBe(`*/${String(ORGANISE_INTERVAL_MINUTES)} * * * *`);
  });
});
