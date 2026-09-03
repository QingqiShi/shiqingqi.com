import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Disclosure } from "./disclosure.tsx";

describe("Disclosure", () => {
  it("renders the summary as the trigger's accessible name", () => {
    render(<Disclosure summary="Packing list">Passport</Disclosure>);

    expect(
      screen.getByRole("button", { name: "Packing list" }),
    ).toBeInTheDocument();
  });

  it("starts collapsed with the panel hidden but mounted", () => {
    render(<Disclosure summary="Packing list">Passport</Disclosure>);

    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Passport")).not.toBeVisible();
  });

  it("reveals the panel on click and collapses it again", async () => {
    const user = userEvent.setup();
    render(<Disclosure summary="Packing list">Passport</Disclosure>);

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Passport")).toBeVisible();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Passport")).not.toBeVisible();
  });

  it("points aria-controls at the panel", () => {
    render(<Disclosure summary="Packing list">Passport</Disclosure>);

    const panelId = screen.getByRole("button").getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(
      screen.getByText("Passport").closest(`#${String(panelId)}`),
    ).not.toBeNull();
  });

  it("opens by default when asked", () => {
    render(
      <Disclosure summary="Packing list" defaultOpen>
        Passport
      </Disclosure>,
    );

    expect(screen.getByText("Passport")).toBeVisible();
  });

  it("works as a controlled disclosure", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <Disclosure summary="Packing list" open={open} onOpenChange={setOpen}>
          Passport
        </Disclosure>
      );
    }
    render(<Controlled />);

    expect(screen.getByText("Passport")).not.toBeVisible();
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Passport")).toBeVisible();
  });

  it("reports toggles through onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Disclosure summary="Packing list" onOpenChange={onOpenChange}>
        Passport
      </Disclosure>,
    );

    await user.click(screen.getByRole("button"));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("hides the icon but announces the trailing slot", () => {
    render(
      <Disclosure
        summary="Packing list"
        icon={<span data-testid="icon" />}
        trailing="2/5"
      >
        Passport
      </Disclosure>,
    );

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute(
      "aria-hidden",
    );
    // A count is content, not decoration: hiding it would leave the completion
    // state visible only to sighted users. Name-from-content runs the two
    // together with no separator.
    expect(
      screen.getByRole("button", { name: "Packing list2/5" }),
    ).toBeInTheDocument();
  });

  it("omits the trailing slot when it resolves to nothing", () => {
    function PackingList({ packedCount }: { packedCount: number }) {
      return (
        <Disclosure summary="Packing list" trailing={packedCount && "done"}>
          Passport
        </Disclosure>
      );
    }
    render(<PackingList packedCount={0} />);

    expect(
      screen.getByRole("button", { name: "Packing list" }),
    ).toBeInTheDocument();
  });

  it("drops the indicator when it resolves to nothing", () => {
    function Row({ hasChildren }: { hasChildren: boolean }) {
      return (
        <Disclosure
          summary="Packing list"
          indicator={hasChildren && <span data-testid="caret" />}
        >
          Passport
        </Disclosure>
      );
    }
    const { container } = render(<Row hasChildren={false} />);

    // An empty 1em slot on leaf rows would push their summary out of line with
    // the branches'.
    const trigger = container.querySelector("button");
    expect(trigger?.children).toHaveLength(1);
  });

  it("drops the indicator when passed null", () => {
    const { container } = render(
      <Disclosure summary="Packing list" indicator={null}>
        Passport
      </Disclosure>,
    );

    expect(container.querySelector("svg")).toBeNull();
  });

  it("wraps itself in the shared card surface for the card variant", () => {
    render(
      <Disclosure summary="Packing list" variant="card" data-testid="root">
        Passport
      </Disclosure>,
    );

    expect(screen.getByTestId("root").className).toContain("cardSurface.base");
  });

  it("forwards native div attributes and composes a css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Disclosure summary="Packing list" id="list" css={overrides.box}>
        Passport
      </Disclosure>,
    );

    const root = document.getElementById("list");
    expect(root).not.toBeNull();
    expect(root?.className).toContain("overrides.box");
  });
});
