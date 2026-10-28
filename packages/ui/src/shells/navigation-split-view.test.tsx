import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NavigationSplitView,
  SplitViewLink,
  type SplitViewLinkProps,
} from "./navigation-split-view.tsx";

/** Records each link it follows, and stays on the page, which jsdom cannot leave. */
function stayingLink(followed: string[]) {
  return function StayingLink(props: SplitViewLinkProps) {
    return (
      <a
        {...props}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) followed.push(props.href);
          event.preventDefault();
        }}
      />
    );
  };
}

type ViewProps = ComponentProps<typeof NavigationSplitView>;

/** An account list, a ledger of three rows, and the second row open. */
function ledgerView(overrides: Partial<ViewProps> = {}): ViewProps {
  return {
    closeLabel: "Close",
    sidebar: {
      label: "Accounts",
      node: (
        <>
          <SplitViewLink href="/?account=a">Everyday</SplitViewLink>
          <SplitViewLink href="/?account=b">Savings</SplitViewLink>
        </>
      ),
    },
    content: {
      label: "Everyday",
      key: "a",
      back: { href: "/", label: "Household" },
      node: (
        <>
          <SplitViewLink href="/?account=a&tx=1">Bakery</SplitViewLink>
          <SplitViewLink href="/?account=a&tx=2">Trains</SplitViewLink>
          <SplitViewLink href="/?account=a&tx=3">Salary</SplitViewLink>
          <input aria-label="Search" />
          <div role="radiogroup" aria-label="Range">
            <button type="button" role="radio" aria-checked>
              1Y
            </button>
          </div>
        </>
      ),
    },
    detail: {
      label: "Transaction",
      key: "2",
      back: { href: "/?account=a", label: "Everyday" },
      node: <button type="button">Save</button>,
    },
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("NavigationSplitView keys", () => {
  it("takes the deepest column off on Esc and on ←, once for each column", () => {
    const replace = vi.fn();
    const { rerender } = render(
      <NavigationSplitView {...ledgerView({ replace })} />,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(replace).toHaveBeenCalledExactlyOnceWith("/?account=a");

    window.history.replaceState(null, "", "/?account=a");
    rerender(
      <NavigationSplitView {...ledgerView({ replace, detail: null })} />,
    );
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(replace).toHaveBeenLastCalledWith("/");
  });

  it("leaves Esc and ← to fields, arrow-key controls and open dialogs", () => {
    const replace = vi.fn();
    render(<NavigationSplitView {...ledgerView({ replace })} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Search" }), {
      key: "Escape",
    });
    fireEvent.keyDown(screen.getByRole("radio", { name: "1Y" }), {
      key: "ArrowLeft",
    });
    const dialog = document.createElement("div");
    dialog.setAttribute("aria-modal", "true");
    document.body.append(dialog);
    fireEvent.keyDown(document.body, { key: "Escape" });
    dialog.remove();
    expect(replace).not.toHaveBeenCalled();
  });

  it("moves focus between the column links of the focused column on J and K, and follows one on →", () => {
    const followed: string[] = [];
    render(
      <NavigationSplitView
        {...ledgerView({ linkComponent: stayingLink(followed), detail: null })}
      />,
    );
    const bakery = screen.getByRole("link", { name: "Bakery" });
    bakery.focus();
    fireEvent.keyDown(bakery, { key: "j" });
    expect(screen.getByRole("link", { name: "Trains" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "j" });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "j" });
    expect(screen.getByRole("link", { name: "Salary" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "k" });
    expect(screen.getByRole("link", { name: "Trains" })).toHaveFocus();

    const everyday = screen.getByRole("link", { name: "Everyday" });
    everyday.focus();
    fireEvent.keyDown(everyday, { key: "j" });
    expect(screen.getByRole("link", { name: "Savings" })).toHaveFocus();

    const trains = screen.getByRole("link", { name: "Trains" });
    trains.focus();
    fireEvent.keyDown(trains, { key: "ArrowRight" });
    expect(followed).toEqual(["/?account=a&tx=2"]);
  });
});

describe("NavigationSplitView history", () => {
  it("pushes a column link that opens a deeper column, and replaces one that changes an open column", () => {
    const followed: string[] = [];
    const replace = vi.fn();
    const { rerender } = render(
      <NavigationSplitView
        {...ledgerView({
          replace,
          linkComponent: stayingLink(followed),
          detail: null,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Trains" }));
    expect(followed).toEqual(["/?account=a&tx=2"]);
    expect(replace).not.toHaveBeenCalled();

    rerender(
      <NavigationSplitView
        {...ledgerView({ replace, linkComponent: stayingLink(followed) })}
      />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Salary" }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/?account=a&tx=3");
    expect(followed).toEqual(["/?account=a&tx=2"]);
  });

  it("goes back one entry to take a column off where that entry is the column under it", () => {
    const replace = vi.fn();
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    window.history.replaceState(null, "", "/?account=a&tx=2");
    vi.stubGlobal("navigation", {
      addEventListener: () => {},
      removeEventListener: () => {},
      currentEntry: { index: 1 },
      entries: () => [
        { url: `${window.location.origin}/?account=a` },
        { url: window.location.href },
      ],
    });
    render(<NavigationSplitView {...ledgerView({ replace })} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("replaces the entry with the back URL where the entry before is another page", () => {
    const replace = vi.fn();
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    vi.stubGlobal("navigation", {
      addEventListener: () => {},
      removeEventListener: () => {},
      currentEntry: { index: 1 },
      entries: () => [
        { url: `${window.location.origin}/elsewhere` },
        { url: window.location.href },
      ],
    });
    render(<NavigationSplitView {...ledgerView({ replace })} />);
    fireEvent.click(screen.getByRole("link", { name: "Household" }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/");
    expect(back).not.toHaveBeenCalled();
  });
});
