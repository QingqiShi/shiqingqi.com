import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useTheme } from "./use-theme.ts";

function ThemeProbe() {
  const [theme, setTheme] = useTheme();
  return (
    <button
      type="button"
      onClick={() => {
        setTheme("dark");
      }}
    >
      {theme}
    </button>
  );
}

it("renders and switches theme when the browser blocks storage", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });

  render(<ThemeProbe />);
  expect(screen.getByRole("button").textContent).toBe("system");

  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("button").textContent).toBe("dark");
});
