import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { SourceCitations } from "./source-citations";

describe("SourceCitations", () => {
  it("renders nothing when sources array is empty", () => {
    const { container } = render(<SourceCitations sources={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a heading and list of sources", () => {
    render(
      <SourceCitations
        sources={[
          {
            sourceId: "src-1",
            url: "https://www.example.com/article",
            title: "Example Article",
          },
        ]}
      />,
    );

    expect(screen.getByText("Sources")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Example Article/i });
    expect(link).toHaveAttribute("href", "https://www.example.com/article");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows domain next to title", () => {
    render(
      <SourceCitations
        sources={[
          {
            sourceId: "src-1",
            url: "https://www.nytimes.com/2024/article",
            title: "Breaking News",
          },
        ]}
      />,
    );

    expect(screen.getByText("Breaking News")).toBeInTheDocument();
    expect(screen.getByText("nytimes.com")).toBeInTheDocument();
  });

  it("falls back to domain when title is missing", () => {
    render(
      <SourceCitations
        sources={[
          {
            sourceId: "src-1",
            url: "https://www.example.com/page",
          },
        ]}
      />,
    );

    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("renders multiple sources", () => {
    render(
      <SourceCitations
        sources={[
          {
            sourceId: "src-1",
            url: "https://example.com/a",
            title: "First Source",
          },
          {
            sourceId: "src-2",
            url: "https://other.com/b",
            title: "Second Source",
          },
        ]}
      />,
    );

    expect(screen.getByText("First Source")).toBeInTheDocument();
    expect(screen.getByText("Second Source")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("handles invalid URLs gracefully", () => {
    render(
      <SourceCitations
        sources={[
          {
            sourceId: "src-1",
            url: "not-a-valid-url",
          },
        ]}
      />,
    );

    // Falls back to showing the raw URL string
    expect(screen.getByText("not-a-valid-url")).toBeInTheDocument();
  });
});
