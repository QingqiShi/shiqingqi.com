import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ChatActionsContext } from "./chat-actions-context";
import {
  parseReviewSummaryOutput,
  ToolReviewSummary,
} from "./tool-review-summary";

function makeReviewData(
  overrides: Partial<Parameters<typeof ToolReviewSummary>[0]["data"]> = {},
) {
  return {
    id: 550,
    mediaType: "movie" as const,
    title: "Fight Club",
    spiciness: 3,
    summary: "A thrilling and thought-provoking film that divided critics.",
    reviewCount: 15,
    averageRating: 8.2,
    ...overrides,
  };
}

const mockActions = {
  sendMessage: () => {},
  attachedMedia: null,
  setAttachedMedia: () => {},
};

function renderWithActions(ui: React.ReactNode) {
  return render(
    <ChatActionsContext value={mockActions}>{ui}</ChatActionsContext>,
  );
}

describe("ToolReviewSummary", () => {
  it("renders summary text", () => {
    renderWithActions(
      <ToolReviewSummary data={makeReviewData()} isInteractive />,
    );

    expect(
      screen.getByText(
        "A thrilling and thought-provoking film that divided critics.",
      ),
    ).toBeInTheDocument();
  });

  it("renders review count", () => {
    renderWithActions(
      <ToolReviewSummary data={makeReviewData()} isInteractive />,
    );

    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/reviews/)).toBeInTheDocument();
  });

  it("renders singular review count", () => {
    renderWithActions(
      <ToolReviewSummary
        data={makeReviewData({ reviewCount: 1 })}
        isInteractive
      />,
    );

    expect(screen.getByText("1 review")).toBeInTheDocument();
  });

  it("renders average rating when available", () => {
    renderWithActions(
      <ToolReviewSummary data={makeReviewData()} isInteractive />,
    );

    expect(screen.getByText(/8\.2/)).toBeInTheDocument();
  });

  it("rounds fractional ratings to one decimal", () => {
    renderWithActions(
      <ToolReviewSummary
        data={makeReviewData({ averageRating: 7.4234 })}
        isInteractive
      />,
    );

    expect(screen.getByText("★ 7.4")).toBeInTheDocument();
    expect(screen.queryByText(/7\.4234/)).not.toBeInTheDocument();
  });

  it("exposes an accessible rating label", () => {
    renderWithActions(
      <ToolReviewSummary
        data={makeReviewData({ averageRating: 7.4234 })}
        isInteractive
      />,
    );

    expect(
      screen.getByRole("img", { name: "Average rating: 7.4 out of 10" }),
    ).toBeInTheDocument();
  });

  it("omits average rating when null", () => {
    renderWithActions(
      <ToolReviewSummary
        data={makeReviewData({ averageRating: null })}
        isInteractive
      />,
    );

    expect(screen.queryByText("★")).not.toBeInTheDocument();
  });

  it("renders spiciness buttons when interactive", () => {
    renderWithActions(
      <ToolReviewSummary data={makeReviewData()} isInteractive />,
    );

    expect(screen.getByRole("button", { name: "Mild" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Balanced" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fire" })).toBeInTheDocument();
  });

  it("hides spiciness buttons when not interactive", () => {
    renderWithActions(
      <ToolReviewSummary data={makeReviewData()} isInteractive={false} />,
    );

    expect(
      screen.queryByRole("button", { name: "Mild" }),
    ).not.toBeInTheDocument();
  });

  it("renders header text", () => {
    renderWithActions(
      <ToolReviewSummary data={makeReviewData()} isInteractive />,
    );

    expect(screen.getByText("Review Summary")).toBeInTheDocument();
  });
});

describe("parseReviewSummaryOutput", () => {
  it("parses valid output", () => {
    const output = {
      id: 550,
      mediaType: "movie",
      title: "Fight Club",
      spiciness: 3,
      summary: "Great movie.",
      reviewCount: 10,
      averageRating: 8.5,
    };
    const result = parseReviewSummaryOutput(output);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(550);
    expect(result?.summary).toBe("Great movie.");
    expect(result?.averageRating).toBe(8.5);
  });

  it("handles null averageRating", () => {
    const output = {
      id: 550,
      mediaType: "movie",
      title: "Fight Club",
      spiciness: 3,
      summary: "Great movie.",
      reviewCount: 0,
      averageRating: null,
    };
    const result = parseReviewSummaryOutput(output);
    expect(result).not.toBeNull();
    expect(result?.averageRating).toBeNull();
  });

  it("returns null for invalid output", () => {
    expect(parseReviewSummaryOutput(null)).toBeNull();
    expect(parseReviewSummaryOutput(undefined)).toBeNull();
    expect(parseReviewSummaryOutput("string")).toBeNull();
    expect(parseReviewSummaryOutput({ id: "not-a-number" })).toBeNull();
  });

  it("rejects invalid mediaType", () => {
    const output = {
      id: 550,
      mediaType: "person",
      title: "Fight Club",
      spiciness: 3,
      summary: "Great movie.",
      reviewCount: 10,
      averageRating: 8.5,
    };
    expect(parseReviewSummaryOutput(output)).toBeNull();
  });

  it("rejects missing summary", () => {
    const output = {
      id: 550,
      mediaType: "movie",
      title: "Fight Club",
      spiciness: 3,
      reviewCount: 10,
      averageRating: 8.5,
    };
    expect(parseReviewSummaryOutput(output)).toBeNull();
  });

  it("rejects missing title", () => {
    const output = {
      id: 550,
      mediaType: "movie",
      spiciness: 3,
      summary: "Great movie.",
      reviewCount: 10,
      averageRating: 8.5,
    };
    expect(parseReviewSummaryOutput(output)).toBeNull();
  });
});
