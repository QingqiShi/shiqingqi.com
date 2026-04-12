import { describe, expect, it } from "vitest";
import { toolError } from "#src/ai-chat/tools/tool-error.ts";
import { render, screen, userEvent, within } from "#src/test-utils.tsx";
import { ToolActivityGroup } from "./tool-activity-group";
import { ToolActivityLine } from "./tool-activity-line";

function getIconPath(root: HTMLElement | Element | null): string | null {
  return root?.querySelector("svg path")?.getAttribute("d") ?? null;
}

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

  it("does not collapse when all tools complete but still streaming", () => {
    render(<ToolActivityGroup toolParts={completeParts} isStreaming />);

    // Should show all lines directly, no disclosure button
    expect(screen.getByText("TMDB Search")).toBeInTheDocument();
    expect(screen.getByText("Semantic Search")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("forwards structured error output to lines in the expanded disclosure view", async () => {
    const errorOutput = toolError("tmdb_unavailable", "TMDB went down");
    const errorParts = [
      {
        toolCallId: "call-err",
        toolName: "tmdb_search",
        state: "output-available",
        input: { query: "broken" },
        output: errorOutput,
      },
    ] as const;

    // Reference lines rendered standalone so we know what the error vs.
    // success icon path looks like without depending on a brittle class name.
    const { container: errorRef } = render(
      <ToolActivityLine
        toolName="tmdb_search"
        state="output-available"
        input={{ query: "broken" }}
        output={errorOutput}
      />,
    );
    const { container: okRef } = render(
      <ToolActivityLine
        toolName="tmdb_search"
        state="output-available"
        input={{ query: "broken" }}
      />,
    );
    const errorIconPath = getIconPath(errorRef);
    const okIconPath = getIconPath(okRef);
    expect(errorIconPath).toBeTruthy();
    expect(okIconPath).toBeTruthy();
    expect(errorIconPath).not.toBe(okIconPath);

    // Render the group, expand it, and verify the line inside the expanded
    // view renders the error icon — i.e. `output` was forwarded. Scope all
    // queries to the group's container so the standalone reference lines
    // rendered above don't leak into the assertions.
    const user = userEvent.setup();
    const { container: groupContainer } = render(
      <ToolActivityGroup toolParts={errorParts} />,
    );
    const group = within(groupContainer);
    await user.click(group.getByRole("button"));

    const expandedIconPath = getIconPath(
      group.getByText("TMDB Search").closest("div"),
    );
    expect(expandedIconPath).toBe(errorIconPath);
  });

  it("forwards structured error output while tools are still in progress", () => {
    const errorOutput = toolError("vector_search_unavailable", "index down");
    const mixedParts = [
      {
        toolCallId: "call-err",
        toolName: "semantic_search",
        state: "output-available",
        input: { query: "broken" },
        output: errorOutput,
      },
      {
        toolCallId: "call-progress",
        toolName: "tmdb_search",
        state: "input-streaming",
        input: undefined,
      },
    ] as const;

    const { container: errorRef } = render(
      <ToolActivityLine
        toolName="semantic_search"
        state="output-available"
        input={{ query: "broken" }}
        output={errorOutput}
      />,
    );
    const errorIconPath = getIconPath(errorRef);
    expect(errorIconPath).toBeTruthy();

    const { container: groupContainer } = render(
      <ToolActivityGroup toolParts={mixedParts} />,
    );
    const group = within(groupContainer);
    const groupIconPath = getIconPath(
      group.getByText("Semantic Search").closest("div"),
    );
    expect(groupIconPath).toBe(errorIconPath);
  });
});
