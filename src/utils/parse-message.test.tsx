import { describe, it, expect } from "vitest";
import { render } from "@/test-utils";
import { parseMessage } from "./parse-message";

describe("parseMessage", () => {
  describe("plain text", () => {
    it("returns plain text without any tags", async () => {
      const result = parseMessage("Hello world");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.textContent).toBe("Hello world");
    });

    it("preserves whitespace in plain text", async () => {
      const result = parseMessage("  Hello   world  ");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.textContent).toBe("  Hello   world  ");
    });
  });

  describe("single tags", () => {
    it("parses <strong> tags", async () => {
      const result = parseMessage("This is <strong>important</strong>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.innerHTML).toContain("<strong>important</strong>");
      expect(container.textContent).toBe("This is important");
    });

    it("parses <em> tags", async () => {
      const result = parseMessage("This is <em>emphasized</em>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.innerHTML).toContain("<em>emphasized</em>");
      expect(container.textContent).toBe("This is emphasized");
    });

    it("parses <b> tags", async () => {
      const result = parseMessage("This is <b>bold</b>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.innerHTML).toContain("<b>bold</b>");
      expect(container.textContent).toBe("This is bold");
    });

    it("parses <i> tags", async () => {
      const result = parseMessage("This is <i>italic</i>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.innerHTML).toContain("<i>italic</i>");
      expect(container.textContent).toBe("This is italic");
    });

    it("parses <p> tags", async () => {
      const result = parseMessage("<p>Paragraph text</p>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.innerHTML).toContain("<p>Paragraph text</p>");
      expect(container.textContent).toBe("Paragraph text");
    });
  });

  describe("nested tags", () => {
    it("parses nested <strong> inside <em>", async () => {
      const result = parseMessage("<em>This is <strong>nested</strong></em>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("em")).toBeTruthy();
      expect(container.querySelector("em strong")).toBeTruthy();
      expect(container.textContent).toBe("This is nested");
    });

    it("parses nested <em> inside <strong>", async () => {
      const result = parseMessage(
        "<strong>Bold with <em>emphasis</em></strong>",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("strong em")).toBeTruthy();
      expect(container.textContent).toBe("Bold with emphasis");
    });

    it("parses deeply nested tags", async () => {
      const result = parseMessage(
        "<p>Paragraph with <strong>bold and <em>italic and <b>more bold</b></em></strong></p>",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.querySelector("p strong")).toBeTruthy();
      expect(container.querySelector("p strong em")).toBeTruthy();
      expect(container.querySelector("p strong em b")).toBeTruthy();
      expect(container.textContent).toBe(
        "Paragraph with bold and italic and more bold",
      );
    });
  });

  describe("multiple sequential tags", () => {
    it("parses multiple tags in sequence", async () => {
      const result = parseMessage(
        "Start <strong>bold</strong> then <em>italic</em> and <b>more bold</b> end",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelectorAll("strong")).toHaveLength(1);
      expect(container.querySelectorAll("em")).toHaveLength(1);
      expect(container.querySelectorAll("b")).toHaveLength(1);
      expect(container.textContent).toBe(
        "Start bold then italic and more bold end",
      );
    });

    it("parses adjacent tags without spacing", async () => {
      const result = parseMessage(
        "<strong>bold</strong><em>italic</em><i>more</i>",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelectorAll("strong")).toHaveLength(1);
      expect(container.querySelectorAll("em")).toHaveLength(1);
      expect(container.querySelectorAll("i")).toHaveLength(1);
      expect(container.textContent).toBe("bolditalicmore");
    });
  });

  describe("malformed HTML and edge cases", () => {
    it("handles unclosed tags gracefully", async () => {
      const result = parseMessage("<strong>This is unclosed");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      // Should still render the tag even if not properly closed
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.textContent).toBe("This is unclosed");
    });

    it("ignores unknown tags", async () => {
      const result = parseMessage("Text with <unknown>tag</unknown> inside");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("unknown")).toBeFalsy();
      // The unknown tag content should still appear as text
      expect(container.textContent).toContain("tag");
    });

    it("handles mixed known and unknown tags", async () => {
      const result = parseMessage(
        "<strong>bold</strong> and <unknown>ignored</unknown> text",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("unknown")).toBeFalsy();
      expect(container.textContent).toContain("bold");
      expect(container.textContent).toContain("ignored");
    });

    it("handles tag attributes gracefully", async () => {
      const result = parseMessage('<strong class="test">Text</strong>');
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.textContent).toBe("Text");
    });
  });

  describe("empty and whitespace", () => {
    it("handles empty string", async () => {
      const result = parseMessage("");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.textContent).toBe("");
    });

    it("handles whitespace-only string", async () => {
      const result = parseMessage("   ");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.textContent).toBe("   ");
    });

    it("handles empty tags", async () => {
      const result = parseMessage("<strong></strong>");
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.textContent).toBe("");
    });
  });

  describe("complex real-world scenarios", () => {
    it("parses translation-like messages with multiple formatting", async () => {
      const result = parseMessage(
        "Welcome <strong>user</strong>! You have <em>3 new messages</em> in your <b>inbox</b>.",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.textContent).toBe(
        "Welcome user! You have 3 new messages in your inbox.",
      );
      expect(container.querySelector("strong")).toBeTruthy();
      expect(container.querySelector("em")).toBeTruthy();
      expect(container.querySelector("b")).toBeTruthy();
    });

    it("preserves text between and around tags", async () => {
      const result = parseMessage(
        "Before <strong>middle1</strong> between <em>middle2</em> after",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.textContent).toBe(
        "Before middle1 between middle2 after",
      );
    });

    it("handles paragraphs with nested formatting", async () => {
      const result = parseMessage(
        "<p>First paragraph with <strong>bold</strong></p><p>Second paragraph with <em>emphasis</em></p>",
      );
      const screen = await render(<>{result}</>);
      const container = await screen.container.element();
      expect(container.querySelectorAll("p")).toHaveLength(2);
      expect(container.querySelector("p strong")).toBeTruthy();
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs[0]?.textContent).toBe("First paragraph with bold");
      expect(paragraphs[1]?.textContent).toBe("Second paragraph with emphasis");
    });
  });
});
