import { describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { ToolActivityGroup } from "./tool-activity-group";

const completeParts = [
  {
    toolCallId: "call-1",
    toolName: "tmdb_search",
    state: "output-available",
    input: { query: "Inception" },
  },
  {
    toolCallId: "call-2",
    toolName: "semantic_search",
    state: "output-available",
    input: { query: "sci-fi" },
  },
  {
    toolCallId: "call-3",
    toolName: "present_media",
    state: "output-available",
    input: { media: [{ id: 1, media_type: "movie" }] },
  },
] as const;

const inProgressParts = [
  {
    toolCallId: "call-4",
    toolName: "tmdb_search",
    state: "output-available",
    input: { query: "Inception" },
  },
  {
    toolCallId: "call-5",
    toolName: "semantic_search",
    state: "input-streaming",
    input: undefined,
  },
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

  it("ties the disclosure button to the expanded region via aria-controls", async () => {
    const user = userEvent.setup();
    render(<ToolActivityGroup toolParts={completeParts} />);

    const button = screen.getByRole("button");
    const controlsId = button.getAttribute("aria-controls") ?? "";
    expect(controlsId).not.toBe("");

    // Target element must exist in the DOM in both the collapsed and
    // expanded states so assistive tech can resolve aria-controls.
    const collapsedTarget = document.getElementById(controlsId);
    expect(collapsedTarget).not.toBeNull();
    expect(collapsedTarget).toHaveAttribute("hidden");

    await user.click(button);

    const expandedTarget = document.getElementById(controlsId);
    expect(expandedTarget).not.toBeNull();
    expect(expandedTarget).not.toHaveAttribute("hidden");
  });

  it("hides activity lines by default when all complete", () => {
    render(<ToolActivityGroup toolParts={completeParts} />);

    expect(screen.getByText("TMDB Search")).not.toBeVisible();
  });

  it("toggles expanded state on click", async () => {
    const user = userEvent.setup();
    render(<ToolActivityGroup toolParts={completeParts} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("TMDB Search")).toBeVisible();
    expect(screen.getByText("Semantic Search")).toBeVisible();
    expect(screen.getByText("Presenting Results")).toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("TMDB Search")).not.toBeVisible();
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

  it("does not collapse when all tools complete but still streaming", () => {
    render(<ToolActivityGroup toolParts={completeParts} isStreaming />);

    // Should show all lines directly, no disclosure button
    expect(screen.getByText("TMDB Search")).toBeInTheDocument();
    expect(screen.getByText("Semantic Search")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
