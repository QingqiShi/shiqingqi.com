import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FilterChips } from "./filter-chips.tsx";

function Harness() {
  const [value, setValue] = useState<"all" | "filed" | "junk" | "problems">(
    "all",
  );
  return (
    <form>
      <FilterChips
        aria-label="Show"
        options={[
          { value: "all", label: "All" },
          { value: "filed", label: "Filed" },
          { value: "junk", label: "Junk" },
          { value: "problems", label: "Problems", count: 1 },
        ]}
        value={value}
        onChange={setValue}
      />
    </form>
  );
}

describe("FilterChips", () => {
  beforeAll(() => {
    // jsdom has no layout, so it does not implement `scrollIntoView`.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("is one named group of radios, with the count in the chip's name", () => {
    render(<Harness />);

    expect(screen.getByRole("radiogroup", { name: "Show" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Problems 1" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("takes one Tab stop and moves the selection with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "All" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    const filed = screen.getByRole("radio", { name: "Filed" });
    expect(filed).toHaveFocus();
    expect(filed).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Problems 1" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "All" })).toHaveFocus();

    await user.tab();
    expect(document.body).toHaveFocus();
  });
});
