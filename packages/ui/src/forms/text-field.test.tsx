import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextField } from "./text-field.tsx";

describe("TextField", () => {
  it("accepts typed input through its label", async () => {
    const user = userEvent.setup();
    render(<TextField label="Name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Ada");
    expect(input).toHaveValue("Ada");
  });
});
