import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ChatMessage } from "./chat-message";

function createMessage(
  overrides: Partial<UIMessage> & Pick<UIMessage, "role" | "parts">,
): UIMessage {
  return {
    id: "test-message",
    ...overrides,
  };
}

describe("ChatMessage", () => {
  it("renders user message text", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [{ type: "text", text: "Hello there" }],
        })}
      />,
    );
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("renders assistant message text", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "text", text: "Hi! How can I help?" }],
        })}
      />,
    );
    expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
  });

  it("renders multiple text parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [
            { type: "text", text: "First paragraph" },
            { type: "text", text: "Second paragraph" },
          ],
        })}
      />,
    );
    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });

  it("renders reasoning parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "reasoning", text: "Thinking about this..." }],
        })}
      />,
    );
    expect(screen.getByText("Thinking about this...")).toBeInTheDocument();
  });

  it("renders markdown in assistant messages", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "text", text: "This is **bold** and *italic*" }],
        })}
      />,
    );
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
  });

  it("does not render markdown in user messages", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [{ type: "text", text: "This is **not bold**" }],
        })}
      />,
    );
    expect(screen.getByText("This is **not bold**")).toBeInTheDocument();
  });

  it("does not crash on step-start parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "step-start" }, { type: "text", text: "After step" }],
        })}
      />,
    );
    expect(screen.getByText("After step")).toBeInTheDocument();
  });

  it("renders present_media cards from search results lookup", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [
            { type: "text", text: "Here are some results:" },
            {
              type: "dynamic-tool",
              toolName: "tmdb_search",
              toolCallId: "search-call",
              state: "output-available",
              input: { query: "Inception" },
              output: [
                {
                  id: 1,
                  media_type: "movie",
                  title: "Inception",
                  poster_path: "/inception.jpg",
                  vote_average: 8.4,
                },
                {
                  id: 2,
                  media_type: "movie",
                  title: "Other Movie",
                  poster_path: "/other.jpg",
                  vote_average: 5.0,
                },
              ],
            },
            {
              type: "dynamic-tool",
              toolName: "present_media",
              toolCallId: "present-call",
              state: "output-available",
              input: { media: [{ id: 1, media_type: "movie" }] },
              output: { media: [{ id: 1, media_type: "movie" }] },
            },
            { type: "text", text: "Hope that helps!" },
          ],
        })}
      />,
    );

    expect(screen.getByText("Here are some results:")).toBeInTheDocument();
    expect(screen.getByText("Hope that helps!")).toBeInTheDocument();
    // Only the presented item renders as a card, not all search results
    expect(screen.getByAltText("Inception")).toBeInTheDocument();
    expect(screen.queryByAltText("Other Movie")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/movie-database/movie/1",
    );
  });

  it("does not render cards for search tool parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [
            {
              type: "dynamic-tool",
              toolName: "tmdb_search",
              toolCallId: "search-call",
              state: "output-available",
              input: { query: "Inception" },
              output: [
                {
                  id: 1,
                  media_type: "movie",
                  title: "Inception",
                  poster_path: "/inception.jpg",
                  vote_average: 8.4,
                },
              ],
            },
          ],
        })}
      />,
    );

    // Search tool parts render nothing — only present_media renders cards
    expect(screen.queryByAltText("Inception")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
