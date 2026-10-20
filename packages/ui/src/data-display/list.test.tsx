import * as stylex from "@stylexjs/stylex";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ListRow, type ListRowLinkProps } from "./list-row.tsx";
import { List } from "./list.tsx";

describe("List", () => {
  it("renders a list on the card surface", () => {
    render(
      <List aria-label="Weeks">
        <ListRow href="/a">A</ListRow>
      </List>,
    );
    const list = screen.getByRole("list", { name: "Weeks" });
    expect(list.tagName).toBe("UL");
    expect(list.className).toContain("cardSurface.base");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("composes a caller css that sizes the list", () => {
    const overrides = stylex.create({ narrow: { maxInlineSize: "20rem" } });
    render(
      <List aria-label="Weeks" css={overrides.narrow}>
        <ListRow href="/a">A</ListRow>
      </List>,
    );
    expect(screen.getByRole("list", { name: "Weeks" }).className).toContain(
      "overrides.narrow",
    );
  });
});

describe("ListRow", () => {
  it("renders a link with href", () => {
    render(
      <List>
        <ListRow href="/reports/1">12 Oct – 18 Oct</ListRow>
      </List>,
    );
    expect(
      screen.getByRole("link", { name: "12 Oct – 18 Oct" }),
    ).toHaveAttribute("href", "/reports/1");
  });

  it("renders the link through linkComponent", () => {
    function RouterLink(props: ListRowLinkProps) {
      return <a data-router {...props} />;
    }
    render(
      <List>
        <ListRow href="/a" linkComponent={RouterLink}>
          A
        </ListRow>
      </List>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute(
      "data-router",
    );
  });

  it("renders a button with onClick and calls it", () => {
    const onClick = vi.fn();
    render(
      <List>
        <ListRow onClick={onClick}>Groceries</ListRow>
      </List>,
    );
    const button = screen.getByRole("button", { name: "Groceries" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("names the row from its slots and hides the caret from it", () => {
    const { container } = render(
      <List>
        <ListRow
          href="/a"
          detail="3 accounts"
          trailing={<span>Last week</span>}
        >
          Cash
        </ListRow>
      </List>,
    );
    expect(
      screen.getByRole("link", { name: /^Cash.*3 accounts.*Last week$/ }),
    ).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden] svg")).not.toBeNull();
  });

  it("drops the caret when caret is false or the row has actions", () => {
    const { container } = render(
      <List>
        <ListRow href="/a" caret={false}>
          A
        </ListRow>
        <ListRow onClick={() => {}} actions={<button type="button">Up</button>}>
          B
        </ListRow>
      </List>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("puts actions beside the row, not inside it", () => {
    render(
      <List>
        <ListRow onClick={() => {}} actions={<button type="button">Up</button>}>
          Groceries
        </ListRow>
      </List>,
    );
    const row = screen.getByRole("button", { name: "Groceries" });
    const up = screen.getByRole("button", { name: "Up" });
    expect(row.contains(up)).toBe(false);
    expect(row.parentElement).toBe(up.parentElement?.parentElement);
  });

  it("forwards aria-current, ref and a css override to the link", () => {
    const ref = createRef<HTMLElement>();
    const overrides = stylex.create({ indent: { paddingInlineStart: "2rem" } });
    render(
      <List>
        <ListRow href="/a" aria-current="page" ref={ref} css={overrides.indent}>
          A
        </ListRow>
      </List>,
    );
    const link = screen.getByRole("link", { name: "A" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(ref.current).toBe(link);
    expect(link.className).toContain("overrides.indent");
    expect(link.className).toContain("selected.quiet");
  });
});
