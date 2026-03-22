import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("renders plain text as a paragraph", () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders headings", () => {
    render(
      <MarkdownContent
        content={"# Heading 1\n\n## Heading 2\n\n### Heading 3"}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Heading 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Heading 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Heading 3" }),
    ).toBeInTheDocument();
  });

  it("renders bold text", () => {
    render(<MarkdownContent content="This is **bold** text" />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("renders italic text", () => {
    render(<MarkdownContent content="This is *italic* text" />);
    expect(screen.getByText("italic").tagName).toBe("EM");
  });

  it("renders strikethrough text", () => {
    render(<MarkdownContent content="This is ~~deleted~~ text" />);
    expect(screen.getByText("deleted").tagName).toBe("DEL");
  });

  it("renders inline code", () => {
    render(<MarkdownContent content="Use `console.log` here" />);
    expect(screen.getByText("console.log").tagName).toBe("CODE");
  });

  it("renders fenced code blocks", () => {
    const { container } = render(
      <MarkdownContent content={"```js\nconst x = 1;\n```"} />,
    );
    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    const code = pre?.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toBe("const x = 1;\n");
  });

  it("renders unordered lists", () => {
    render(
      <MarkdownContent content={"- Item one\n- Item two\n- Item three"} />,
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Item one")).toBeInTheDocument();
  });

  it("renders ordered lists", () => {
    render(<MarkdownContent content={"1. First\n2. Second\n3. Third"} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("renders links with correct attributes", () => {
    render(<MarkdownContent content="Visit [Example](https://example.com)" />);
    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders blockquotes", () => {
    render(<MarkdownContent content="> This is a quote" />);
    expect(screen.getByText("This is a quote")).toBeInTheDocument();
    expect(
      screen.getByText("This is a quote").closest("blockquote"),
    ).toBeInTheDocument();
  });

  it("renders multiple paragraphs", () => {
    render(<MarkdownContent content={"First paragraph\n\nSecond paragraph"} />);
    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });
});
