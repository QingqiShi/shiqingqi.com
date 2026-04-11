import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ChatMessage } from "./chat-message";
import { accumulateToolOutputs } from "./map-tool-output";
import { MediaDetailProvider } from "./media-detail-context";

function createMessage(
  overrides: Partial<UIMessage> & Pick<UIMessage, "role" | "parts">,
): UIMessage {
  return {
    id: "test-message",
    ...overrides,
  };
}

const emptyToolOutputs = accumulateToolOutputs([]);

describe("ChatMessage", () => {
  it("renders user message text", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [{ type: "text", text: "Hello there" }],
        })}
        toolOutputs={emptyToolOutputs}
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
        toolOutputs={emptyToolOutputs}
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
        toolOutputs={emptyToolOutputs}
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
        toolOutputs={emptyToolOutputs}
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
        toolOutputs={emptyToolOutputs}
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
        toolOutputs={emptyToolOutputs}
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
        toolOutputs={emptyToolOutputs}
      />,
    );
    expect(screen.getByText("After step")).toBeInTheDocument();
  });

  it("returns null for message with only step-start parts", () => {
    const { container } = render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [{ type: "step-start" }],
        })}
        toolOutputs={emptyToolOutputs}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders present_media cards from search results lookup", () => {
    const message = createMessage({
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
    });
    render(
      <MediaDetailProvider>
        <ChatMessage
          message={message}
          toolOutputs={accumulateToolOutputs([message])}
        />
      </MediaDetailProvider>,
    );

    expect(screen.getByText("Here are some results:")).toBeInTheDocument();
    expect(screen.getByText("Hope that helps!")).toBeInTheDocument();
    // Only the presented item renders as a card, not all search results
    expect(screen.getByAltText("Inception")).toBeInTheDocument();
    expect(screen.queryByAltText("Other Movie")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Inception" }),
    ).toBeInTheDocument();
  });

  it("renders present_watch_providers card from watch_providers map", () => {
    const message = createMessage({
      role: "assistant",
      parts: [
        { type: "text", text: "Here's where you can watch it:" },
        {
          type: "dynamic-tool",
          toolName: "watch_providers",
          toolCallId: "wp-call",
          state: "output-available",
          input: { id: 550, media_type: "movie", region: "US" },
          output: {
            id: 550,
            mediaType: "movie",
            region: "US",
            providers: {
              link: "https://www.themoviedb.org/movie/550/watch?locale=US",
              flatrate: [
                {
                  id: 8,
                  name: "Netflix",
                  logoPath: "/netflix.jpg",
                },
              ],
              rent: [],
              buy: [],
              ads: [],
              free: [],
            },
          },
        },
        {
          type: "dynamic-tool",
          toolName: "present_watch_providers",
          toolCallId: "present-wp-call",
          state: "output-available",
          input: { id: 550, media_type: "movie", region: "US" },
          output: { id: 550, media_type: "movie", region: "US" },
        },
      ],
    });
    render(
      <MediaDetailProvider>
        <ChatMessage
          message={message}
          toolOutputs={accumulateToolOutputs([message])}
        />
      </MediaDetailProvider>,
    );

    expect(
      screen.getByText("Here's where you can watch it:"),
    ).toBeInTheDocument();
    expect(screen.getByText("Where to Watch")).toBeInTheDocument();
    expect(screen.getByAltText("Netflix")).toBeInTheDocument();
  });

  it("does not render cards for search tool parts but shows activity", () => {
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
        toolOutputs={emptyToolOutputs}
      />,
    );

    // Search tool parts render no media cards
    expect(screen.queryByAltText("Inception")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // But the tool activity group is present (collapsed, showing "1 tool call")
    expect(screen.getByText("1 tool call")).toBeInTheDocument();
  });

  it("renders present_media cards using accumulated tool outputs from prior messages", () => {
    render(
      <MediaDetailProvider>
        <ChatMessage
          message={createMessage({
            role: "assistant",
            parts: [
              {
                type: "dynamic-tool",
                toolName: "present_media",
                toolCallId: "present-call-2",
                state: "output-available",
                input: { media: [{ id: 1, media_type: "movie" }] },
                output: { media: [{ id: 1, media_type: "movie" }] },
              },
              { type: "text", text: "Here it is again!" },
            ],
          })}
          toolOutputs={{
            searchResultsMap: new Map([
              [
                "movie:1",
                {
                  id: 1,
                  title: "Inception",
                  posterPath: "/inception.jpg",
                  rating: 8.4,
                  mediaType: "movie" as const,
                },
              ],
            ]),
            personResultsMap: new Map(),
            watchProvidersMap: new Map(),
          }}
        />
      </MediaDetailProvider>,
    );

    // The poster image should render using data from the cumulative map
    expect(screen.getByAltText("Inception")).toBeInTheDocument();
    expect(screen.getByText("Here it is again!")).toBeInTheDocument();
  });

  it("shows tool activity group for tool parts", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "assistant",
          parts: [
            {
              type: "dynamic-tool",
              toolName: "tmdb_search",
              toolCallId: "search-1",
              state: "output-available",
              input: { query: "Inception" },
              output: [],
            },
            {
              type: "dynamic-tool",
              toolName: "semantic_search",
              toolCallId: "search-2",
              state: "output-available",
              input: { query: "sci-fi" },
              output: [],
            },
          ],
        })}
        toolOutputs={emptyToolOutputs}
      />,
    );

    expect(screen.getByText("2 tool calls")).toBeInTheDocument();
  });
});
