import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { TypingIndicator } from "./typing-indicator";

describe("TypingIndicator", () => {
  it("renders with role status", () => {
    render(<TypingIndicator label="AI is thinking…" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("displays the label text", () => {
    render(<TypingIndicator label="AI is thinking…" />);
    expect(
      screen.getByRole("status", { name: "AI is thinking…" }),
    ).toBeInTheDocument();
  });

  it("has aria-label matching the label prop", () => {
    render(<TypingIndicator label="AI is thinking…" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "AI is thinking…",
    );
  });

  it("remains in DOM when isExiting is true", () => {
    render(<TypingIndicator label="AI is thinking…" isExiting />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
