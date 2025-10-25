import { describe, it, expect } from "vitest";
import { render } from "@/test-utils";
import { Button } from "./button";

describe("Button StyleX Integration", () => {
  it("renders button with StyleX classes applied", async () => {
    const screen = await render(<Button>Test Button</Button>);

    const button = screen.getByRole("button");

    // Verify that StyleX is working by checking that real classes are applied
    await expect.element(button).toBeInTheDocument();
    expect((await button.element()).className).toBeTruthy();
    expect((await button.element()).className).toContain(
      "button__styles.button",
    );
  });

  it("applies different classes for bright variant", async () => {
    const normalScreen = await render(<Button>Normal</Button>);
    const brightScreen = await render(<Button bright>Bright</Button>);

    const normalButton = normalScreen.getByRole("button");
    const brightButton = brightScreen.getByRole("button");

    const normalElement = await normalButton.element();
    const brightElement = await brightButton.element();

    // Different variants should have different class names
    expect(normalElement.className).not.toBe(brightElement.className);
    expect(brightElement.className).toContain("bright");
  });

  it("applies different classes for active state", async () => {
    const normalScreen = await render(<Button>Normal</Button>);
    const activeScreen = await render(<Button isActive>Active</Button>);

    const normalButton = normalScreen.getByRole("button");
    const activeButton = activeScreen.getByRole("button");

    const normalElement = await normalButton.element();
    const activeElement = await activeButton.element();

    // Active state should have different class names
    expect(normalElement.className).not.toBe(activeElement.className);
    expect(activeElement.className).toContain("active");
  });
});
