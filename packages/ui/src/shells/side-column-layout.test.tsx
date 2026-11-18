import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubObservers } from "../test-support/stub-observers.ts";
import { SideColumnLayout } from "./side-column-layout.tsx";

function Assistant() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SideColumnLayout
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
      }}
      title="Assistant"
      closeLabel="Close"
      column={<button type="button">Suggestion</button>}
    >
      {({ isAvailable }) => (
        <>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
            }}
          >
            Ask
          </button>
          <input aria-label="Notes" />
          <output>{String(isAvailable)}</output>
        </>
      )}
    </SideColumnLayout>
  );
}

/** Renders the layout `width` px wide, with room for the column from 1024px. */
function renderAt(width: number) {
  const observers = stubObservers();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return DOMRect.fromRect({
        width: this.tagName === "SPAN" ? 1024 : width,
      });
    },
  );
  const view = render(<Assistant />);
  const root = view.container.firstElementChild;
  if (root === null) throw new Error("The layout did not render.");
  act(() => {
    observers.resize(root, width, 800);
  });
}

function openFromAsk() {
  const ask = screen.getByRole("button", { name: "Ask" });
  ask.focus();
  fireEvent.click(ask);
  return ask;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SideColumnLayout", () => {
  it("moves focus into the column it opens, and back to the opener on close", () => {
    renderAt(1280);
    const ask = openFromAsk();
    const column = screen.getByRole("complementary", { name: "Assistant" });
    expect(column).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(ask).toHaveFocus();
  });

  it("closes on Escape from inside the column, and not from the main content", () => {
    renderAt(1280);
    const ask = openFromAsk();
    const column = screen.getByRole("complementary", { name: "Assistant" });

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Notes" }), {
      key: "Escape",
    });
    expect(column).not.toHaveAttribute("inert");

    fireEvent.keyDown(screen.getByRole("button", { name: "Suggestion" }), {
      key: "Escape",
    });
    // The column stays while it moves out, and takes no input.
    expect(column).toHaveAttribute("inert");
    expect(ask).toHaveFocus();
  });

  it("shows no column where it has no room, and says so", () => {
    renderAt(800);
    openFromAsk();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("false");
  });
});
