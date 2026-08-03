import { describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import type { CodeToken } from "./code/code-token.ts";
import { Specimen, SpecimenGrid } from "./specimen.tsx";

// What the Babel plugin will inject. The tests pass it by hand, because the
// plugin runs only over real showcase files.
const SOURCE: readonly CodeToken[] = [
  ["punct", "<"],
  ["component", "Badge"],
  ["punct", ">"],
  ["plain", "New"],
  ["punct", "</"],
  ["component", "Badge"],
  ["punct", ">"],
];

describe("Specimen", () => {
  it("shows the instance and its caption", () => {
    render(
      <Specimen caption="Primary" source={SOURCE}>
        <button>Add to watchlist</button>
      </Specimen>,
    );

    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toBeVisible();
    expect(screen.getByText("Primary")).toBeVisible();
  });

  it("keeps the source closed until the visitor asks for it", () => {
    render(
      <Specimen caption="Primary" source={SOURCE}>
        <span>instance</span>
      </Specimen>,
    );

    const control = screen.getByRole("button", { name: "Code" });

    expect(control).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("New")).not.toBeVisible();
  });

  it("opens the source, and reports the state on the control", async () => {
    render(
      <Specimen caption="Primary" source={SOURCE}>
        <span>instance</span>
      </Specimen>,
    );
    const control = screen.getByRole("button", { name: "Code" });

    await userEvent.click(control);

    expect(control).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("New")).toBeVisible();

    await userEvent.click(control);

    expect(control).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("New")).not.toBeVisible();
  });

  it("points the control at the panel it opens", () => {
    const { container } = render(
      <Specimen caption="Primary" source={SOURCE}>
        <span>instance</span>
      </Specimen>,
    );
    const control = screen.getByRole("button", { name: "Code" });

    const panelId = control.getAttribute("aria-controls");
    expect(panelId).not.toBeNull();
    expect(container.querySelector(`#${CSS.escape(String(panelId))}`)).not.toBe(
      null,
    );
  });

  // The panel spans the grid through `gridColumn: 1 / -1`, which only works
  // while it is a grid item itself. Nested inside the cell it would be stuck in
  // one 220px track and every line would scroll.
  it("puts the panel beside the cell, not inside it", () => {
    const { container } = render(
      <SpecimenGrid>
        <Specimen caption="Primary" source={SOURCE}>
          <span>instance</span>
        </Specimen>
      </SpecimenGrid>,
    );
    const control = screen.getByRole("button", { name: "Code" });
    const panel = container.querySelector(
      `[id="${String(control.getAttribute("aria-controls"))}"]`,
    );
    const grid = container.firstElementChild;

    expect([...(grid?.children ?? [])]).toHaveLength(2);
    expect(panel?.parentElement).toBe(grid);
    expect(panel?.previousElementSibling?.contains(control)).toBe(true);
  });

  // `source={undefined}` is written out because the Babel plugin skips an
  // element that already carries the prop. Without it the plugin would fill
  // this specimen in and there would be nothing left to test.
  it("hides the control while there is no source", () => {
    render(
      <Specimen caption="Primary" source={undefined}>
        <span>instance</span>
      </Specimen>,
    );

    expect(screen.queryByRole("button", { name: "Code" })).toBeNull();
    expect(screen.getByText("Primary")).toBeVisible();
  });
});

describe("SpecimenGrid", () => {
  it("places every specimen it is given", () => {
    render(
      <SpecimenGrid>
        <Specimen caption="Small">
          <span>small</span>
        </Specimen>
        <Specimen caption="Large">
          <span>large</span>
        </Specimen>
      </SpecimenGrid>,
    );

    expect(screen.getByText("Small")).toBeVisible();
    expect(screen.getByText("Large")).toBeVisible();
  });
});
