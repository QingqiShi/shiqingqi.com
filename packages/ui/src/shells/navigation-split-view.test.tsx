import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ComponentProps } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { stubObservers } from "../test-support/stub-observers.ts";
import {
  NavigationSplitView,
  SplitViewLink,
  useSplitViewColumn,
  useSplitViewShared,
  type SplitViewLinkProps,
} from "./navigation-split-view.tsx";

function Probe({ name }: { name: string }) {
  const state = useSplitViewColumn();
  return (
    <p>
      {name}: {state?.column}{" "}
      {state?.scroller
        ? "scroller"
        : state != null && state.scroller === undefined
          ? "page"
          : "none"}
    </p>
  );
}

function Mounts({ name, log }: { name: string; log: string[] }) {
  useEffect(() => {
    log.push(name);
  }, [name, log]);
  return <p>{name}</p>;
}

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

describe("NavigationSplitView", () => {
  it("names a region for each column it has", () => {
    render(
      <NavigationSplitView
        closeLabel="Close"
        sidebar={{ node: "Accounts", label: "Accounts" }}
        collapsedSidebar="Logos"
        content={{ node: "Ledger", label: "Ledger" }}
        detail={{
          node: "Editor",
          label: "Transaction",
          back: { href: "/ledger", label: "Ledger" },
        }}
      />,
    );
    expect(screen.getAllByRole("region", { name: "Accounts" })).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Ledger" })).toHaveTextContent(
      "Ledger",
    );
    expect(
      screen.getByRole("region", { name: "Transaction" }),
    ).toHaveTextContent("Editor");
  });

  it("renders no detail and no collapsed sidebar that are not passed", () => {
    render(
      <NavigationSplitView
        closeLabel="Close"
        sidebar={{ node: "Accounts", label: "Accounts" }}
        content={{ node: "Household", label: "Household" }}
      />,
    );
    expect(screen.getAllByRole("region")).toHaveLength(2);
  });

  it("tells each column which it is and gives it its scroller", () => {
    // jsdom applies no StyleX styles, so a rule gives the scrollers their
    // overflow.
    const style = document.createElement("style");
    style.textContent =
      "[data-split-view-page] > :first-child { overflow-y: auto; }";
    document.head.append(style);
    onTestFinished(() => {
      style.remove();
    });
    render(
      <NavigationSplitView
        closeLabel="Close"
        sidebar={{ node: <Probe name="a" />, label: "Accounts" }}
        content={{ node: <Probe name="b" />, label: "Ledger" }}
        detail={{
          node: <Probe name="c" />,
          label: "Transaction",
          back: { href: "/ledger", label: "Ledger" },
        }}
      />,
    );
    expect(screen.getByText("a: sidebar scroller")).toBeInTheDocument();
    expect(screen.getByText("b: content scroller")).toBeInTheDocument();
    expect(screen.getByText("c: detail scroller")).toBeInTheDocument();
  });

  it("tells a column whose box does not scroll that the page scrolls it", () => {
    render(
      <NavigationSplitView
        closeLabel="Close"
        content={{ node: <Probe name="b" />, label: "Ledger" }}
      />,
    );
    expect(screen.getByText("b: content page")).toBeInTheDocument();
  });

  it("puts a column's back link before its node and its accessory after it", () => {
    render(
      <NavigationSplitView
        closeLabel="Close"
        content={{
          node: "Ledger",
          label: "Ledger",
          back: { href: "/household", label: "Household" },
          accessory: <button type="button">Add</button>,
        }}
      />,
    );
    const region = screen.getByRole("region", { name: "Ledger" });
    expect(
      within(region).getByRole("link", { name: "Household" }),
    ).toHaveAttribute("href", "/household");
    expect(region).toHaveTextContent(/^HouseholdLedgerAdd$/);
  });

  it("names the detail after the content beside it and closes it to its back", () => {
    const replace = vi.fn();
    render(<NavigationSplitView {...ledgerView({ replace })} />);
    const detail = screen.getByRole("region", { name: "Transaction" });
    expect(detail).toHaveTextContent(/^Everyday.*Transaction/);
    fireEvent.click(within(detail).getByRole("button", { name: "Close" }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/?account=a");
  });

  it("shows the detail in a sheet where it does not fit beside the content", () => {
    const observers = stubObservers();
    const replace = vi.fn();
    const { container } = render(
      <NavigationSplitView {...ledgerView({ replace })} />,
    );
    const view = container.firstElementChild;
    if (view === null) throw new Error("No view");
    act(() => {
      observers.resize(view, 390, 844);
    });
    expect(screen.queryByRole("region", { name: "Transaction" })).toBeNull();
    const sheet = screen.getByRole("dialog", { name: "Transaction" });
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeVisible();
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/?account=a");

    act(() => {
      observers.resize(view, 1280, 800);
    });
    expect(
      screen.getByRole("region", { name: "Transaction" }),
    ).toBeInTheDocument();
  });

  it("is null outside a split view", () => {
    render(<Probe name="x" />);
    expect(screen.getByText("x: none")).toBeInTheDocument();
  });

  it("keeps the other columns when the detail comes and goes", () => {
    const log: string[] = [];
    const columns = (detail: boolean) => (
      <NavigationSplitView
        closeLabel="Close"
        sidebar={{
          node: <Mounts name="sidebar" log={log} />,
          label: "Accounts",
        }}
        content={{ node: <Mounts name="content" log={log} />, label: "Ledger" }}
        detail={
          detail
            ? {
                node: "Editor",
                label: "Transaction",
                back: { href: "/ledger", label: "Ledger" },
              }
            : null
        }
      />
    );
    const { rerender } = render(columns(false));
    const content = screen.getByRole("region", { name: "Ledger" });
    rerender(columns(true));
    rerender(columns(false));
    expect(screen.getByRole("region", { name: "Ledger" })).toBe(content);
    expect(log).toEqual(["sidebar", "content"]);
  });

  it("shows the column again from the start when its key changes", () => {
    const log: string[] = [];
    const columns = (key: string) => (
      <NavigationSplitView
        closeLabel="Close"
        content={{
          node: <Mounts name="content" log={log} />,
          label: "Ledger",
          key,
        }}
      />
    );
    const { rerender } = render(columns("a"));
    const region = screen.getByRole("region", { name: "Ledger" });
    rerender(columns("a"));
    expect(log).toEqual(["content"]);
    rerender(columns("b"));
    expect(screen.getByRole("region", { name: "Ledger" })).toBe(region);
    expect(log).toEqual(["content", "content"]);
  });
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

function Shared({ name, children }: { name: string; children: string }) {
  const ref = useSplitViewShared(name);
  return (
    <span ref={ref} data-shared={name}>
      {children}
    </span>
  );
}

/** Goes to its URL as a router does, which the test then renders. */
function RouterLink(props: SplitViewLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.history.pushState(null, "", props.href);
      }}
    />
  );
}

/** A ledger whose row "Bakery" flies into the detail where it opens. */
function flyingView(isOpen: boolean) {
  return (
    <NavigationSplitView
      closeLabel="Close"
      linkComponent={RouterLink}
      content={{
        label: "Everyday",
        node: (
          <SplitViewLink href="/?tx=1">
            {isOpen ? "Bakery" : <Shared name="tx-1">Bakery</Shared>}
          </SplitViewLink>
        ),
      }}
      detail={
        isOpen
          ? {
              label: "Transaction",
              key: "1",
              back: { href: "/", label: "Everyday" },
              node: <Shared name="tx-1">Bakery</Shared>,
            }
          : null
      }
    />
  );
}

/** The Shared element and the copies of it that fly. */
function sharedCount(container: HTMLElement) {
  return container.querySelectorAll('[data-shared="tx-1"]').length;
}

describe("NavigationSplitView Shared elements", () => {
  // jsdom has no layout, and the view flies only an element with a box.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return this.matches("[data-shared]")
          ? DOMRect.fromRect({ width: 80, height: 20 })
          : DOMRect.fromRect();
      },
    );
  });

  it("flies a Shared element for a column link it follows", () => {
    const { container, rerender } = render(flyingView(false));
    fireEvent.click(screen.getByRole("link", { name: "Bakery" }));
    rerender(flyingView(true));
    expect(sharedCount(container)).toBe(3);
  });

  it("flies a Shared element for a step through the history, read at its navigate event", () => {
    const navigation = new EventTarget();
    vi.stubGlobal("navigation", navigation);
    const { container, rerender } = render(flyingView(false));
    navigation.dispatchEvent(
      Object.assign(new Event("navigate"), {
        navigationType: "traverse",
        destination: { url: `${window.location.origin}/?tx=1` },
      }),
    );
    window.history.replaceState(null, "", "/?tx=1");
    rerender(flyingView(true));
    expect(sharedCount(container)).toBe(3);
  });

  it("flies a Shared element for Forward of the browser, read at popstate without the Navigation API", () => {
    const { container, rerender } = render(flyingView(false));
    window.history.replaceState(null, "", "/?tx=1");
    fireEvent(window, new PopStateEvent("popstate"));
    rerender(flyingView(true));
    expect(sharedCount(container)).toBe(3);
  });

  it("moves the columns with no flight for a navigation it did not start", () => {
    const { container, rerender } = render(flyingView(false));
    window.history.pushState(null, "", "/?tx=1");
    rerender(flyingView(true));
    expect(sharedCount(container)).toBe(1);
  });

  it("flies no Shared element where the motion lands at another URL than the link", () => {
    const { container, rerender } = render(flyingView(false));
    fireEvent.click(screen.getByRole("link", { name: "Bakery" }));
    window.history.replaceState(null, "", "/?tx=2");
    rerender(flyingView(true));
    expect(sharedCount(container)).toBe(1);
  });

  it("drops the snapshot of a navigation that lands with no motion", () => {
    const { container, rerender } = render(flyingView(false));
    fireEvent.click(screen.getByRole("link", { name: "Bakery" }));
    rerender(flyingView(false));
    rerender(flyingView(true));
    expect(sharedCount(container)).toBe(1);
  });
});
