import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Switch } from "./switch.tsx";

describe("Switch", () => {
  beforeEach(() => {
    // jsdom has no pointer capture.
    vi.spyOn(HTMLElement.prototype, "setPointerCapture").mockImplementation(
      () => {},
    );
    vi.spyOn(HTMLElement.prototype, "releasePointerCapture").mockImplementation(
      () => {},
    );
    HTMLElement.prototype.hasPointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("toggles from on to off when clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch value="on" onChange={handleChange} />);

    await user.click(screen.getByRole("switch"));

    expect(handleChange).toHaveBeenCalledExactlyOnceWith("off");
  });

  it("toggles when an associated <label> is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <>
        <label htmlFor="labelled-switch">Toggle theme</label>
        <Switch id="labelled-switch" onChange={handleChange} />
      </>,
    );

    await user.click(screen.getByText("Toggle theme"));

    expect(handleChange).toHaveBeenCalledWith("on");
  });

  it("toggles when Space or Enter is pressed", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch onChange={handleChange} />);
    screen.getByRole("switch").focus();

    await user.keyboard(" ");
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledTimes(2);
  });

  it("does not respond to keyboard input when disabled", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch disabled onChange={handleChange} />);
    screen.getByRole("switch").focus();

    await user.keyboard(" ");
    await user.keyboard("{Enter}");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("does not repeat the toggle while a key is held down", () => {
    const handleChange = vi.fn();
    render(<Switch onChange={handleChange} />);
    const switchElement = screen.getByRole("switch");
    switchElement.focus();

    fireEvent.keyDown(switchElement, { code: "Space" });
    fireEvent.keyDown(switchElement, { code: "Space", repeat: true });
    fireEvent.keyDown(switchElement, { code: "Space", repeat: true });

    expect(handleChange).toHaveBeenCalledExactlyOnceWith("on");
  });

  it("does not toggle from a release without a press on it", () => {
    const handleChange = vi.fn();
    render(<Switch onChange={handleChange} />);

    fireEvent.pointerUp(screen.getByRole("switch"), {
      pointerId: 1,
      clientX: 120,
      button: 0,
      pointerType: "mouse",
    });

    expect(handleChange).not.toHaveBeenCalled();
  });
});
