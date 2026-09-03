import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextField } from "./text-field.tsx";

describe("TextField labelling", () => {
  it("associates the visible label with the input", () => {
    render(<TextField label="Email address" />);
    const input = screen.getByLabelText("Email address");
    expect(input.tagName).toBe("INPUT");
  });

  it("keeps the accessible name when the label is visually hidden", () => {
    render(<TextField label="Search" labelHidden />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("marks the input required and flags the label without polluting its name", () => {
    render(<TextField label="Name" required />);
    // The accessible name stays "Name" (the asterisk is a decorative ::after).
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toBeRequired();
    expect(screen.getByText("Name").className).toContain("labelRequired");
  });

  it("respects a caller-supplied id", () => {
    render(<TextField label="Name" id="custom-id" />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "custom-id");
  });
});

describe("TextField description and error wiring", () => {
  it("wires the description via aria-describedby", () => {
    render(<TextField label="Email" description="We never share it." />);
    const input = screen.getByLabelText("Email");
    const description = screen.getByText("We never share it.");
    expect(input.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("sets aria-invalid and announces the error as an alert", () => {
    render(<TextField label="Email" error="Email is required" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Email is required");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("omits aria-invalid when there is no error", () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("merges a caller aria-describedby with the description id", () => {
    render(
      <TextField
        label="Name"
        description="Full name"
        aria-describedby="hint"
      />,
    );
    const describedBy =
      screen.getByLabelText("Name").getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("hint");
    expect(describedBy).toContain(screen.getByText("Full name").id);
  });

  it("applies the invalid control style when errored", () => {
    render(<TextField label="Email" error="Bad" />);
    expect(screen.getByLabelText("Email").className).toContain(
      "controlInvalid",
    );
  });
});

describe("TextField interaction and forwarding", () => {
  it("accepts typed input", async () => {
    const user = userEvent.setup();
    render(<TextField label="Name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Ada");
    expect(input).toHaveValue("Ada");
  });

  it("forwards a ref to the input element", () => {
    const ref: { current: HTMLInputElement | null } = { current: null };
    render(<TextField label="Name" ref={ref} />);
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("forwards native input attributes", () => {
    render(<TextField label="Email" type="email" placeholder="you@x.com" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "you@x.com");
  });
});

describe("TextField size and adornments", () => {
  it("applies distinct control classes per size", () => {
    render(
      <>
        <TextField label="Small" size="sm" />
        <TextField label="Large" size="lg" />
      </>,
    );
    const small = screen.getByLabelText("Small");
    const large = screen.getByLabelText("Large");
    expect(small.className).not.toBe(large.className);
    expect(small.className).toContain("fieldSizeBox.sm");
    expect(large.className).toContain("fieldSizeBox.lg");
  });

  it("renders leading and trailing adornments as decorative slots", () => {
    render(
      <TextField
        label="Amount"
        leading={<span data-testid="lead">$</span>}
        trailing={<span data-testid="trail">USD</span>}
      />,
    );
    expect(screen.getByTestId("lead").parentElement).toHaveAttribute(
      "aria-hidden",
    );
    expect(screen.getByTestId("trail").parentElement).toHaveAttribute(
      "aria-hidden",
    );
    const input = screen.getByLabelText("Amount");
    expect(input.className).toContain("hasLeadingAffix");
    expect(input.className).toContain("hasTrailingAffix");
  });
});
