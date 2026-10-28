import { describe, it, expect } from "vitest";
import { render } from "#src/testing/test-utils.tsx";
import { parseMessage } from "./parse-message";

describe("parseMessage", () => {
  it("parses <strong> tags", () => {
    const result = parseMessage("This is <strong>important</strong>");
    const { container } = render(<>{result}</>);
    expect(container.innerHTML).toContain("<strong>important</strong>");
    expect(container.textContent).toBe("This is important");
  });

  it("preserves text after inner closing tag within outer element", () => {
    const result = parseMessage(
      "<strong>bold <em>italic</em> still bold</strong>",
    );
    const { container } = render(<>{result}</>);
    expect(container.querySelector("strong em")).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe(
      "bold italic still bold",
    );
  });

  it("ignores unknown tags", () => {
    const result = parseMessage("Text with <unknown>tag</unknown> inside");
    const { container } = render(<>{result}</>);
    expect(container.querySelector("unknown")).toBeFalsy();
    expect(container.textContent).toContain("tag");
  });
});
