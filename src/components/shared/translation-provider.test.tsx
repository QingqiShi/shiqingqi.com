import React, { use } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { TranslationConfig } from "#src/types.ts";
import { TranslationContext } from "#src/utils/translation-context.ts";
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

  it("provides translations and renders children for both locales", () => {
    const { rerender } = render(
      <TranslationProvider translations={mockTranslations} locale="en">
        <div data-testid="test-child">Test Content</div>
        <TestConsumer />
      </TranslationProvider>,
    );

    // Verify children render
    expect(screen.getByTestId("test-child")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();

    // Verify English translations
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("hello")).toHaveTextContent("Hello");
    expect(screen.getByTestId("submit")).toHaveTextContent("Submit");

    // Test Chinese locale
    rerender(
      <TranslationProvider translations={mockTranslations} locale="zh">
        <div data-testid="test-child">Test Content</div>
        <TestConsumer />
      </TranslationProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("zh");
    expect(screen.getByTestId("hello")).toHaveTextContent("你好");
    expect(screen.getByTestId("submit")).toHaveTextContent("提交");
  });

  it("handles empty translations", () => {
    function EmptyConsumer() {
      const context = use(TranslationContext);
      return (
        <div data-testid="empty">
          {JSON.stringify(context?.translations || {})}
        </div>
      );
    }

    render(
      <TranslationProvider translations={{}} locale="en">
        <EmptyConsumer />
      </TranslationProvider>,
    );

    expect(screen.getByTestId("empty")).toHaveTextContent("{}");
  });

  it("provides context without errors", () => {
    function ContextConsumer() {
      const context = use(TranslationContext);
      if (!context) return <div data-testid="no-context">No context</div>;

      return <div data-testid="has-context">Has context</div>;
    }

    render(
      <TranslationProvider translations={mockTranslations} locale="en">
        <ContextConsumer />
      </TranslationProvider>,
    );

    expect(screen.getByTestId("has-context")).toBeInTheDocument();
    expect(screen.queryByTestId("no-context")).not.toBeInTheDocument();
  });
});
