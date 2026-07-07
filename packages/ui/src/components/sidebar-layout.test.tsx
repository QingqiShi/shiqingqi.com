import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout.tsx";

// jsdom doesn't implement these APIs used by IconButton's press feedback or
// the drawer's breakpoint watcher. Stub them so the tree can mount without
// tripping on platform gaps.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.animate = vi.fn().mockReturnValue({
    cancel: vi.fn(),
    finish: vi.fn(),
    onfinish: null,
    oncancel: null,
  });
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
});

function renderShell(props?: Partial<Parameters<typeof SidebarLayout>[0]>) {
  return render(
    <SidebarLayout
      sidebar={<a href="/somewhere">Rail</a>}
      menuLabel="Menu"
      closeLabel="Close menu"
      {...props}
    >
      Body
    </SidebarLayout>,
  );
}

describe("SidebarLayout structure", () => {
  it("renders the sidebar slot and the content", () => {
    renderShell();
    expect(screen.getByText("Rail")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders the sidebarHeader slot in both the mobile bar and the rail", () => {
    renderShell({ sidebarHeader: <span>Title</span> });
    expect(screen.getAllByText("Title")).toHaveLength(2);
  });

  it("renders the sidebarFooter slot", () => {
    renderShell({ sidebarFooter: <span>Utilities</span> });
    expect(screen.getByText("Utilities")).toBeInTheDocument();
  });
});

describe("SidebarLayout content landmark", () => {
  it("wraps the content in a <main> landmark by default", () => {
    renderShell();
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toContainElement(screen.getByText("Body"));
  });

  it("renders a plain <div> region when as='div'", () => {
    renderShell({ as: "div" });
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("SidebarLayout drawer", () => {
  it("opens as a dialog from the menu button and closes from the close button", async () => {
    const user = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole("button", { name: "Menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toContainElement(screen.getByText("Rail"));

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when a link inside the drawer is followed", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText("Rail"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("SidebarLayout tuning props", () => {
  it("threads the rail width into the grid track and the sticky offset onto the rail", () => {
    const { container } = renderShell({
      sidebarInlineSize: "240px",
      stickyInsetBlockStart: "80px",
    });
    // The rail width feeds the responsive grid track on the root element.
    expect(container.firstElementChild?.getAttribute("style")).toContain(
      "240px",
    );
    // The sticky offset is applied to the rail panel element itself.
    const rail = screen.getByText("Rail").closest("[style*='80px']");
    expect(rail).not.toBeNull();
  });

  it("caps the content column when contentMaxInlineSize is passed", () => {
    renderShell({ contentMaxInlineSize: "480px" });
    expect(screen.getByText("Body").getAttribute("style")).toContain("480px");
  });
});
