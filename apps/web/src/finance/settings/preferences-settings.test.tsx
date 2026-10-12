import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/testing/test-utils.tsx";
import { PreferencesSettings } from "./preferences-settings.tsx";

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  localStorage.removeItem("theme");
  document.cookie = "NEXT_LOCALE=;max-age=0;path=/";
});

describe("PreferencesSettings", () => {
  it("stores the picked Theme", async () => {
    render(<PreferencesSettings />);
    expect(
      screen.getByRole("radiogroup", { name: "Theme" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("stores the picked Language for the server to read", async () => {
    render(<PreferencesSettings />);
    expect(
      screen.getByRole("radiogroup", { name: "Language" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "中文" }));

    expect(document.cookie).toContain("NEXT_LOCALE=zh");
  });
});
