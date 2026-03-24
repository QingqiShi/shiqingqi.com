import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { I18nContext } from "#src/i18n/i18n-context.ts";
import { render, screen } from "#src/test-utils.tsx";
import { Card } from "./card";

function hashKey(en: string, zh: string) {
  return createHash("sha256")
    .update(en + "\0" + zh)
    .digest("hex")
    .slice(0, 8);
}

const translations = {
  [hashKey("Details", "详情")]: "Details",
};

function renderCard(ui: React.ReactElement) {
  return render(<I18nContext value={{ translations }}>{ui}</I18nContext>);
}

describe("Card", () => {
  it("renders children content", () => {
    renderCard(
      <Card href="/test">
        <div>Test Content</div>
      </Card>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders as an anchor element with href", () => {
    renderCard(
      <Card href="/test-link">
        <div>Card Content</div>
      </Card>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/test-link");
  });

  it("displays details indicator text", () => {
    renderCard(
      <Card href="/test">
        <div>Card Content</div>
      </Card>,
    );

    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("accepts and applies additional props", () => {
    renderCard(
      <Card href="/test" aria-label="Custom Card">
        <div>Card Content</div>
      </Card>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-label", "Custom Card");
  });
});
