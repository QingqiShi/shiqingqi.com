import React, { use } from "react";
import { describe, it, expect } from "vitest";
import { render } from "@/test-utils";
import type { TranslationConfig } from "@/types";
import { TranslationContext } from "@/utils/translation-context";
import { TranslationProvider } from "./translation-provider";

// Test component that uses the translation context
function TestConsumer() {
  const context = use(TranslationContext);
  if (!context) return <div>No context</div>;
  return (
    <div>
      <div data-testid="locale">{context.locale}</div>
      <div data-testid="hello">{context.translations.common?.hello}</div>
      <div data-testid="submit">{context.translations.forms?.submit}</div>
    </div>
  );
}

describe("TranslationProvider", () => {
  const mockTranslations: { [namespace: string]: TranslationConfig } = {
    common: {
      hello: { en: "Hello", zh: "你好" },
    },
    forms: {
      submit: { en: "Submit", zh: "提交" },
    },
  };

  it("provides translations and renders children for both locales", async () => {
    const screen = await render(
      <TranslationProvider translations={mockTranslations} locale="en">
        <div data-testid="test-child">Test Content</div>
        <TestConsumer />
      </TranslationProvider>,
    );

    // Verify children render
    await expect.element(screen.getByTestId("test-child")).toBeInTheDocument();
    await expect.element(screen.getByText("Test Content")).toBeInTheDocument();

    // Verify English translations
    await expect.element(screen.getByTestId("locale")).toHaveTextContent("en");
    await expect.element(screen.getByTestId("hello")).toHaveTextContent("Hello");
    await expect.element(screen.getByTestId("submit")).toHaveTextContent("Submit");

    // Test Chinese locale - render new screen
    const screenZh = await render(
      <TranslationProvider translations={mockTranslations} locale="zh">
        <div data-testid="test-child">Test Content</div>
        <TestConsumer />
      </TranslationProvider>,
    );

    await expect.element(screenZh.getByTestId("locale")).toHaveTextContent("zh");
    await expect.element(screenZh.getByTestId("hello")).toHaveTextContent("你好");
    await expect.element(screenZh.getByTestId("submit")).toHaveTextContent("提交");
  });

  it("handles empty translations", async () => {
    function EmptyConsumer() {
      const context = use(TranslationContext);
      return (
        <div data-testid="empty">
          {JSON.stringify(context?.translations || {})}
        </div>
      );
    }

    const screen = await render(
      <TranslationProvider translations={{}} locale="en">
        <EmptyConsumer />
      </TranslationProvider>,
    );

    await expect.element(screen.getByTestId("empty")).toHaveTextContent("{}");
  });

  it("provides context without errors", async () => {
    function ContextConsumer() {
      const context = use(TranslationContext);
      if (!context) return <div data-testid="no-context">No context</div>;

      return <div data-testid="has-context">Has context</div>;
    }

    const screen = await render(
      <TranslationProvider translations={mockTranslations} locale="en">
        <ContextConsumer />
      </TranslationProvider>,
    );

    await expect.element(screen.getByTestId("has-context")).toBeInTheDocument();
    expect(screen.queryByTestId("no-context")).toBe(null);
  });
});
