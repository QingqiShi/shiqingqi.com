import { describe, expect, it } from "vitest";
import { addWeekdays } from "./add-weekdays.ts";

describe("addWeekdays", () => {
  it("skips the weekend in both directions", () => {
    // 2026-11-20 is a Friday.
    expect(addWeekdays("2026-11-20", 1)).toBe("2026-11-23");
    expect(addWeekdays("2026-11-18", 4)).toBe("2026-11-24");
    expect(addWeekdays("2026-11-23", -1)).toBe("2026-11-20");
  });
});
