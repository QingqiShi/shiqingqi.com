import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MenuItem } from "./menu-item.tsx";

describe("MenuItem", () => {
  it("is a plain button outside a menu", () => {
    render(
      <MenuItem trailing="Wed 12 Nov" onClick={() => {}}>
        Tomorrow
      </MenuItem>,
    );
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(
      screen.getByRole("button", { name: /^Tomorrow/ }),
    ).toBeInTheDocument();
  });
});
