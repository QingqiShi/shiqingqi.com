import { describe, it, expect, vi } from "vitest";
import { render } from "@/test-utils";
import { Card } from "./card";

vi.mock("@/hooks/use-translations", () => ({
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
  it("renders children content", async () => {
    const screen = await render(
      <Card href="/test">
        <div>Test Content</div>
      </Card>,
    );

    await expect.element(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders as an anchor element with href", async () => {
    const screen = await render(
      <Card href="/test-link">
        <div>Card Content</div>
      </Card>,
    );

    const link = screen.getByRole("link");
    await expect.element(link).toHaveAttribute("href", "/test-link");
  });

  it("displays details indicator text", async () => {
    const screen = await render(
      <Card href="/test">
        <div>Card Content</div>
      </Card>,
    );

    await expect.element(screen.getByText("View Details")).toBeInTheDocument();
  });

  it("accepts and applies additional props", async () => {
    const screen = await render(
      <Card href="/test" aria-label="Custom Card">
        <div>Card Content</div>
      </Card>,
    );

    const link = screen.getByRole("link");
    await expect.element(link).toHaveAttribute("aria-label", "Custom Card");
  });
});
