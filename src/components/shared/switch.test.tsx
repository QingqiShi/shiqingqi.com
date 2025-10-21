import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { Switch, type SwitchState } from "./switch";

describe("Switch Component (Radix UI)", () => {
  describe("Basic Rendering and Accessibility", () => {
    it("renders as a switch with proper accessibility attributes", () => {
      render(<Switch />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toHaveAttribute("type", "button");
      expect(switchElement).toHaveAttribute("role", "switch");
    });

    it("applies Tailwind classes correctly", () => {
      render(<Switch />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement.className).toBeTruthy();
      expect(switchElement.className).toContain("inline-flex");
      expect(switchElement.className).toContain("rounded-full");
    });

    it("forwards additional props to the switch element", () => {
      render(
        <Switch
          id="test-switch"
          data-testid="custom-switch"
          aria-label="Toggle setting"
        />,
      );

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("id", "test-switch");
      expect(switchElement).toHaveAttribute("data-testid", "custom-switch");
      expect(switchElement).toHaveAttribute("aria-label", "Toggle setting");
    });

    it("handles disabled state correctly", () => {
      render(<Switch disabled />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeDisabled();
    });
  });

  describe("State Management", () => {
    it("starts in off state by default", () => {
      render(<Switch />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "false");
      expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });

    it("respects initial value prop", () => {
      render(<Switch value="on" />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "true");
      expect(switchElement).toHaveAttribute("data-state", "checked");
    });

    it("treats indeterminate as off", () => {
      render(<Switch value="indeterminate" />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "false");
      expect(switchElement).toHaveAttribute("data-state", "unchecked");
    });
  });

  describe("User Interactions", () => {
    it("toggles state on click", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Switch value="off" onChange={handleChange} />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(handleChange).toHaveBeenCalledWith("on");
    });

    it("toggles from on to off", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Switch value="on" onChange={handleChange} />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(handleChange).toHaveBeenCalledWith("off");
    });

    it("toggles with keyboard (Space)", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Switch value="off" onChange={handleChange} />);

      const switchElement = screen.getByRole("switch");
      switchElement.focus();
      await user.keyboard(" ");

      expect(handleChange).toHaveBeenCalledWith("on");
    });

    it("toggles with keyboard (Enter)", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Switch value="off" onChange={handleChange} />);

      const switchElement = screen.getByRole("switch");
      switchElement.focus();
      await user.keyboard("{Enter}");

      expect(handleChange).toHaveBeenCalledWith("on");
    });

    it("does not toggle when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Switch value="off" onChange={handleChange} disabled />);

      const switchElement = screen.getByRole("switch");
      await user.click(switchElement);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("Controlled Component", () => {
    it("works as a controlled component", async () => {
      const user = userEvent.setup();
      let currentValue: SwitchState = "off";

      const { rerender } = render(
        <Switch
          value={currentValue}
          onChange={(newValue) => {
            currentValue = newValue;
          }}
        />,
      );

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("data-state", "unchecked");

      await user.click(switchElement);
      rerender(
        <Switch
          value={currentValue}
          onChange={(newValue) => {
            currentValue = newValue;
          }}
        />,
      );

      expect(currentValue).toBe("on");
    });
  });
});
