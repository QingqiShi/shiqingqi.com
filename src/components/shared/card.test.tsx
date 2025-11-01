import { describe, it, expect, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { Card } from "./card";

vi.mock("#src/hooks/use-translations.ts", () => ({
  useTranslations: () => ({
    t: (key: string) => (key === "details" ? "View Details" : key),
  }),
}));

vi.mock("./card.stylex", () => ({
  cardTokens: {
    detailsIndicatorOpacity: "detailsIndicatorOpacity",
    detailsIndicatorTransform: "detailsIndicatorTransform",
    imageFilter: "imageFilter",
  },
}));

describe("Card", () => {
  it("renders children content", () => {
    render(
      <Card href="/test">
        <div>Test Content</div>
      </Card>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders as an anchor element with href", () => {
    render(
      <Card href="/test-link">
        <div>Card Content</div>
      </Card>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/test-link");
  });

  it("displays details indicator text", () => {
    render(
      <Card href="/test">
        <div>Card Content</div>
      </Card>,
    );

    expect(screen.getByText("View Details")).toBeInTheDocument();
  });

  it("accepts and applies additional props", () => {
    render(
      <Card href="/test" aria-label="Custom Card">
        <div>Card Content</div>
      </Card>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-label", "Custom Card");
  });
});
