import { describe, expect, test } from "vitest";
import { displayDay } from "../domain/dates/display-day.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { chooseBarTicks } from "./choose-bar-ticks.ts";
import { estimateLabelWidth } from "./estimate-label-width.ts";

const OCTOBER = toEpochDay("2026-10-01");
const dayTick = (locale: string) => (index: number) =>
  displayDay(OCTOBER + index, locale, "day");
const firstOfMonth = (index: number) => index === 0;

function extents(ticks: ReturnType<typeof chooseBarTicks>) {
  return ticks.map((tick) => {
    const width = estimateLabelWidth(tick.label);
    const left =
      tick.anchor === "start"
        ? tick.x
        : tick.anchor === "end"
          ? tick.x - width
          : tick.x - width / 2;
    return { left, right: left + width };
  });
}

describe("estimateLabelWidth", () => {
  test("counts a CJK character as about twice a Latin one", () => {
    expect(estimateLabelWidth("10月1日")).toBeGreaterThan(
      estimateLabelWidth("1 Oct") * 1.2,
    );
    expect(estimateLabelWidth("年")).toBe(12);
  });
});

describe("chooseBarTicks", () => {
  // A 390 px phone leaves about 306 px of plot for 31 days.
  const band = 306 / 31;

  test("keeps ZH day labels apart on a phone", () => {
    const ticks = chooseBarTicks({
      periodCount: 31,
      band,
      tickOf: dayTick("zh"),
      isMajor: firstOfMonth,
    });
    expect(ticks.length).toBeGreaterThan(2);
    const boxes = extents(ticks);
    for (let at = 1; at < boxes.length; at++) {
      expect(boxes[at].left - boxes[at - 1].right).toBeGreaterThanOrEqual(14);
    }
    expect(ticks[0]).toMatchObject({ index: 0, label: "10月1日" });
  });

  test("labels EN days more densely than ZH ones at the same width", () => {
    const en = chooseBarTicks({
      periodCount: 31,
      band,
      tickOf: dayTick("en"),
      isMajor: firstOfMonth,
    });
    const zh = chooseBarTicks({
      periodCount: 31,
      band,
      tickOf: dayTick("zh"),
      isMajor: firstOfMonth,
    });
    expect(en.length).toBeGreaterThanOrEqual(zh.length);
  });

  test("lands month ticks on January", () => {
    const months = ["Nov", "Dec", "2026", "Feb", "Mar", "Apr", "May"];
    const ticks = chooseBarTicks({
      periodCount: months.length,
      band: 20,
      tickOf: (index) => months[index],
      isMajor: (index) => index === 2,
    });
    expect(ticks.map((tick) => tick.index)).toContain(2);
    expect(
      ticks.every(
        (tick) => (tick.index - 2) % (ticks[1].index - ticks[0].index) === 0,
      ),
    ).toBe(true);
  });

  test("labels every period when there is room, anchoring the edges inwards", () => {
    const ticks = chooseBarTicks({
      periodCount: 3,
      band: 100,
      tickOf: (index) => ["Jan", "Feb", "Mar"][index],
    });
    expect(ticks.map((tick) => tick.anchor)).toEqual([
      "middle",
      "middle",
      "middle",
    ]);
    const narrow = chooseBarTicks({
      periodCount: 40,
      band: 6,
      tickOf: (index) => `W${String(index)}`,
    });
    expect(narrow[0].anchor).toBe("start");
  });

  test("gives no ticks to an empty chart", () => {
    expect(
      chooseBarTicks({ periodCount: 0, band: 10, tickOf: () => "" }),
    ).toEqual([]);
  });
});
