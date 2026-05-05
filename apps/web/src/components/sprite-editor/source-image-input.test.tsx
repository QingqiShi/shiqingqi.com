import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#src/test-utils.tsx";
import { SourceImageInput } from "./source-image-input";

describe("SourceImageInput error announcement", () => {
  it("renders the rejection message in a role=alert live region when a non-image is chosen", async () => {
    const onSourceChange = vi.fn();
    render(<SourceImageInput source={null} onSourceChange={onSourceChange} />);

    const input = screen.getByTestId("source-input");
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Not an image file.");
    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it("does not render an alert region in the resting state", () => {
    const onSourceChange = vi.fn();
    render(<SourceImageInput source={null} onSourceChange={onSourceChange} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
