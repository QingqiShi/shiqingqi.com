import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea.tsx";

describe("Textarea", () => {
  it("accepts typed input through its label", async () => {
    const user = userEvent.setup();
    render(<Textarea label="Bio" />);
    const control = screen.getByLabelText("Bio");
    await user.type(control, "Hello");
    expect(control).toHaveValue("Hello");
  });
});
