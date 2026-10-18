import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { BlurPlane, BlurPlaneProvider } from "./blur-plane.tsx";
import { StickyControlGroup, StickyControls } from "./sticky-controls.tsx";

const sortGroup = (
  <StickyControlGroup>
    <button type="button">Sort</button>
  </StickyControlGroup>
);

function renderControls(children: ReactNode = sortGroup) {
  const { container } = render(<StickyControls>{children}</StickyControls>);
  const box = container.firstElementChild;
  if (!(box instanceof HTMLElement)) {
    throw new Error("StickyControls rendered nothing");
  }
  return box;
}

const STUCK_OFFSET_PX = 80;

// jsdom lays nothing out and loads no StyleX sheet, so the row holds at its
// offset only once it is handed a box that has reached it. The position and
// the offset are read back through `getComputedStyle`, which resolves an
// inline style in jsdom.
function scrollTo(box: HTMLElement, top: number, height: number) {
  box.style.position = "sticky";
  box.style.top = `${String(STUCK_OFFSET_PX)}px`;
  layOut(box, { x: 0, y: top, width: 300, height });
  fireEvent.scroll(document);
}

// The layers are the only elements inside the blur hidden from assistive
// technology; the wrapper around them is not.
function blurLayers(scope: HTMLElement) {
  return [...scope.querySelectorAll('[aria-hidden="true"]')];
}

function groupsOf(box: HTMLElement) {
  return [
    ...box.querySelectorAll<HTMLElement>(
      "[class*='progressive-blur__styles.reachRoot']",
    ),
  ];
}

describe("StickyControls", () => {
  it("renders each group as its own blur inside a sticky row", () => {
    const box = renderControls();

    expect(box.className).toContain("sticky-controls__styles.sticky");
    expect(groupsOf(box)).toHaveLength(1);
    expect(groupsOf(box)[0]?.className).toContain("stack__row.tight");
    expect(groupsOf(box)[0]).toContainElement(
      screen.getByRole("button", { name: "Sort" }),
    );
  });

  // A group at each end of the row — filters at the start, a prompt at the
  // end — blurs the page around itself only, so the page between them stays
  // sharp; and they hold and melt together, because the row does.
  it("blurs the page around every group once the row is stuck", async () => {
    const box = renderControls(
      <>
        {sortGroup}
        <StickyControlGroup>
          <button type="button">Ask</button>
        </StickyControlGroup>
      </>,
    );
    const [start, end] = groupsOf(box);
    expect(groupsOf(box)).toHaveLength(2);
    expect(blurLayers(start)).toHaveLength(5);
    expect(blurLayers(end)).toHaveLength(5);

    scrollTo(box, STUCK_OFFSET_PX, 40);

    await waitFor(() => {
      expect(blurLayers(start)[0]?.className).not.toContain(
        "progressive-blur__styles.hidden",
      );
    });
    expect(blurLayers(end)[0]?.className).not.toContain(
      "progressive-blur__styles.hidden",
    );
  });

  it("blurs the page around the controls only once the row is stuck", async () => {
    const box = renderControls();

    // At rest the row is in the flow of the page, where nothing floats over it.
    expect(blurLayers(box)).toHaveLength(5);
    for (const layer of blurLayers(box)) {
      expect(layer.className).toContain("progressive-blur__styles.hidden");
    }

    scrollTo(box, STUCK_OFFSET_PX, 40);

    // The scroll is read on the next animation frame.
    await waitFor(() => {
      expect(blurLayers(box)[0]?.className).not.toContain(
        "progressive-blur__styles.hidden",
      );
    });
  });

  // At the end of its containing block the row is pushed up past its offset
  // and moves with the page again, so nothing scrolls under it any more.
  it("melts the blur out once the end of its container pushes the row past its offset", async () => {
    const box = renderControls();

    scrollTo(box, STUCK_OFFSET_PX, 40);
    await waitFor(() => {
      expect(blurLayers(box)[0]?.className).not.toContain(
        "progressive-blur__styles.hidden",
      );
    });

    scrollTo(box, STUCK_OFFSET_PX - 24, 40);
    await waitFor(() => {
      expect(blurLayers(box)[0]?.className).toContain(
        "progressive-blur__styles.hidden",
      );
    });
  });

  // A row with no box at this breakpoint — the mobile bar above `md`, the
  // desktop bar below it — never holds anywhere, so it never blurs.
  it("never counts a row with no box as stuck", async () => {
    const box = renderControls();

    scrollTo(box, 0, 0);

    await waitFor(() => {
      expect(blurLayers(box)[0]?.className).toContain(
        "progressive-blur__styles.hidden",
      );
    });
  });

  // While the row is in the flow of the page, the page's effects draw over
  // it, so its controls show their own. Once it holds, it rises to its plane.
  it("sits under the effect layer until the row is stuck", async () => {
    const box = renderControls();
    expect(box.className).toContain("use-effect-sticky__styles.unstuck");

    scrollTo(box, STUCK_OFFSET_PX, 40);

    await waitFor(() => {
      expect(box.className).not.toContain("use-effect-sticky__styles.unstuck");
    });
  });

  // Every floating control's blur is painted on the one plane, under all of
  // them, so the header's groups never blur this row and it never blurs them.
  it("paints its blur on the page's plane rather than in its own box", () => {
    const { container } = render(
      <BlurPlaneProvider>
        <div>
          <BlurPlane />
          <StickyControls>{sortGroup}</StickyControls>
        </div>
      </BlurPlaneProvider>,
    );
    const plane = container.querySelector(
      "[class*='blur-plane__styles.plane']",
    );
    const box = screen
      .getByRole("button", { name: "Sort" })
      .closest("[class*='sticky-controls__styles.sticky']");
    if (!(plane instanceof HTMLElement) || !(box instanceof HTMLElement)) {
      throw new Error("the plane or the sticky box is missing");
    }

    expect(blurLayers(plane)).toHaveLength(5);
    expect(blurLayers(box)).toHaveLength(0);
  });
});
