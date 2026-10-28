import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { accumulateToolOutputs } from "#src/movie-database/chat/tool-output/accumulate-tool-outputs.ts";
import { MediaDetailProvider } from "#src/movie-database/details/media-detail-provider.tsx";
import { render, screen } from "#src/testing/test-utils.tsx";
import { ChatMessage } from "./chat-message";

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

    // The poster image should render using data from the cumulative map.
    // Button label carries the title; img has empty alt (decorative).
    const inceptionButton = screen.getByRole("button", { name: "Inception" });
    expect(inceptionButton.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByText("Here it is again!")).toBeInTheDocument();
  });

  it("hides the [User Preferences] scaffolding from user message bubbles", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "[User Preferences]\nLikes: action (genre), Tom Hanks (actor)\nDislikes: horror (genre)",
            },
            { type: "text", text: "find me a feel-good movie tonight" },
          ],
        })}
        toolOutputs={emptyToolOutputs}
      />,
    );

    expect(
      screen.getByText("find me a feel-good movie tonight"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/User Preferences/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Likes:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dislikes:/)).not.toBeInTheDocument();
  });

  it("strips both [User Preferences] and [About: …] scaffolding from the same user message", () => {
    render(
      <ChatMessage
        message={createMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "[User Preferences]\nLikes: drama (genre)",
            },
            {
              type: "text",
              text: "[About: Inception (movie, id:27205)] tell me more",
            },
          ],
        })}
        toolOutputs={emptyToolOutputs}
      />,
    );

    expect(screen.getByText("tell me more")).toBeInTheDocument();
    expect(screen.queryByText(/User Preferences/)).not.toBeInTheDocument();
    expect(screen.queryByText(/About: Inception/)).not.toBeInTheDocument();
  });
});
