import { describe, expect, it } from "vitest";
import { claimEdgeSwipe, shouldPop } from "./claim-edge-swipe.ts";

describe("claimEdgeSwipe", () => {
  it("waits until the pointer has moved far enough to tell", () => {
    expect(claimEdgeSwipe(2, 1)).toBe("wait");
    expect(claimEdgeSwipe(-3, 3)).toBe("wait");
  });

  it("drags a move towards the inline end", () => {
    expect(claimEdgeSwipe(12, 4)).toBe("drag");
    expect(claimEdgeSwipe(8, -7)).toBe("drag");
  });

  it("lets go of a scroll and of a move back towards the edge", () => {
    expect(claimEdgeSwipe(3, 14)).toBe("release");
    expect(claimEdgeSwipe(-10, 0)).toBe("release");
    expect(claimEdgeSwipe(6, 9)).toBe("release");
  });
});

describe("shouldPop", () => {
  const width = 390;

  it("goes back on a flick, however short", () => {
    expect(shouldPop(30, 0.8, width)).toBe(true);
  });

  it("goes back past 40% of the width when the finger is still or slow", () => {
    expect(shouldPop(170, 0, width)).toBe(true);
    expect(shouldPop(170, -0.1, width)).toBe(true);
  });

  it("stays when it was flung back, however far it went", () => {
    expect(shouldPop(300, -0.4, width)).toBe(false);
  });

  it("stays short of 40% of the width without a flick", () => {
    expect(shouldPop(120, 0.3, width)).toBe(false);
  });
});
