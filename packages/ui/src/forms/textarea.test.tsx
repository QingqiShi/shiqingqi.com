import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Textarea } from "./textarea.tsx";

describe("Textarea labelling", () => {
  it("associates the visible label with the textarea", () => {
    render(<Textarea label="Biography" />);
    const control = screen.getByLabelText("Biography");
    expect(control.tagName).toBe("TEXTAREA");
  });

  it("keeps the accessible name when the label is visually hidden", () => {
    render(<Textarea label="Notes" labelHidden />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("marks the control required and flags the label without polluting its name", () => {
    render(<Textarea label="Bio" required />);
    // The accessible name stays "Bio" (the asterisk is a decorative ::after).
    const control = screen.getByRole("textbox", { name: "Bio" });
    expect(control).toBeRequired();
    expect(screen.getByText("Bio").className).toContain("labelRequired");
  });
});

describe("Textarea description and error wiring", () => {
  it("wires the description via aria-describedby", () => {
    render(<Textarea label="Bio" description="Tell us about yourself." />);
    const control = screen.getByLabelText("Bio");
    const description = screen.getByText("Tell us about yourself.");
    expect(control.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("sets aria-invalid and announces the error as an alert", () => {
    render(<Textarea label="Bio" error="Bio is required" />);
    const control = screen.getByLabelText("Bio");
    expect(control).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Bio is required");
    expect(control.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("omits aria-invalid when there is no error", () => {
    render(<Textarea label="Bio" />);
    expect(screen.getByLabelText("Bio")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Textarea interaction and forwarding", () => {
  it("accepts typed input", async () => {
    const user = userEvent.setup();
    render(<Textarea label="Bio" />);
    const control = screen.getByLabelText("Bio");
    await user.type(control, "Hello");
    expect(control).toHaveValue("Hello");
  });

  it("forwards a ref to the textarea element", () => {
    const ref: { current: HTMLTextAreaElement | null } = { current: null };
    render(<Textarea label="Bio" ref={ref} />);
    expect(ref.current?.tagName).toBe("TEXTAREA");
  });

  it("renders a controlled value", () => {
    render(<Textarea label="Bio" value="preset" onChange={() => undefined} />);
    expect(screen.getByLabelText("Bio")).toHaveValue("preset");
  });

  it("defaults to three rows and honours a custom rows count", () => {
    render(
      <>
        <Textarea label="Short" />
        <Textarea label="Tall" rows={6} />
      </>,
    );
    expect(screen.getByLabelText("Short")).toHaveAttribute("rows", "3");
    expect(screen.getByLabelText("Tall")).toHaveAttribute("rows", "6");
  });
});

describe("Textarea size and auto-grow", () => {
  it("applies distinct control classes per size", () => {
    render(
      <>
        <Textarea label="Small" size="sm" />
        <Textarea label="Large" size="lg" />
      </>,
    );
    const small = screen.getByLabelText("Small");
    const large = screen.getByLabelText("Large");
    expect(small.className).not.toBe(large.className);
    expect(small.className).toContain("fieldSizeBox.sm");
    expect(large.className).toContain("fieldSizeBox.lg");
  });

  it("disables manual resize while auto-growing and still forwards onInput", async () => {
    const user = userEvent.setup();
    const handleInput = vi.fn();
    render(<Textarea label="Bio" autoGrow onInput={handleInput} />);
    const control = screen.getByLabelText("Bio");
    expect(control.className).toContain("noResize");
    await user.type(control, "hi");
    expect(control).toHaveValue("hi");
    expect(handleInput).toHaveBeenCalled();
  });
});
