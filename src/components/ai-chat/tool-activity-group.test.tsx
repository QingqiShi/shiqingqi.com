import { describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { ToolActivityGroup } from "./tool-activity-group";

const completeParts = [
  {
    toolName: "tmdb_search",
    state: "output-available",
    input: { query: "Inception" },
  },
  {
    toolName: "semantic_search",
    state: "output-available",
    input: { query: "sci-fi" },
  },
  {
    toolName: "present_media",
    state: "output-available",
    input: { media: [{ id: 1, media_type: "movie" }] },
  },
] as const;

const inProgressParts = [
  {
    toolName: "tmdb_search",
    state: "output-available",
    input: { query: "Inception" },
  },
  { toolName: "semantic_search", state: "input-streaming", input: undefined },
] as const;

describe("ToolActivityGroup", () => {
  it("renders all activity lines when some tools are in-progress", () => {
    render(<ToolActivityGroup toolParts={inProgressParts} />);

    expect(screen.getByText("TMDB Search")).toBeInTheDocument();
    expect(screen.getByText("Semantic Search")).toBeInTheDocument();
    // No disclosure button when in progress
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders disclosure button when all tools are complete", () => {
    render(<ToolActivityGroup toolParts={completeParts} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("3 tool calls")).toBeInTheDocument();
  });

  it("hides activity lines by default when all complete", () => {
    render(<ToolActivityGroup toolParts={completeParts} />);

    expect(screen.queryByText("TMDB Search")).not.toBeInTheDocument();
  });

  it("toggles expanded state on click", async () => {
    const user = userEvent.setup();
    render(<ToolActivityGroup toolParts={completeParts} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("TMDB Search")).toBeInTheDocument();
    expect(screen.getByText("Semantic Search")).toBeInTheDocument();
    expect(screen.getByText("Presenting Results")).toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("TMDB Search")).not.toBeInTheDocument();
  });

  it("shows correct count in summary", () => {
    const twoParts = completeParts.slice(0, 2);
    render(<ToolActivityGroup toolParts={twoParts} />);

    expect(screen.getByText("2 tool calls")).toBeInTheDocument();
  });

  it("shows singular form for 1 tool call", () => {
    const onePart = completeParts.slice(0, 1);
    render(<ToolActivityGroup toolParts={onePart} />);

    expect(screen.getByText("1 tool call")).toBeInTheDocument();
  });

  it("returns null for empty parts array", () => {
    const { container } = render(<ToolActivityGroup toolParts={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
