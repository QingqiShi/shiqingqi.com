import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./table.tsx";

function PlanTable() {
  return (
    <Table caption="Repayment plans">
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">Plan</TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            Threshold
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow current>
          <TableHeaderCell scope="row">Plan 2</TableHeaderCell>
          <TableCell numeric>27,295</TableCell>
        </TableRow>
        <TableRow>
          <TableHeaderCell scope="row">Plan 5</TableHeaderCell>
          <TableCell numeric>25,000</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table naming", () => {
  it("names the table from its caption", () => {
    render(<PlanTable />);
    expect(
      screen.getByRole("table", { name: "Repayment plans" }),
    ).toBeVisible();
  });

  it("hides the caption visually while keeping it announced", () => {
    render(<PlanTable />);
    const caption = screen.getByText("Repayment plans");
    expect(caption.tagName).toBe("CAPTION");
    expect(caption.className).toContain("a11y.srOnly");
  });

  it("shows the caption when asked", () => {
    render(
      <Table caption="Current rates" captionVisible>
        <TableBody>
          <TableRow>
            <TableCell>6.3%</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("Current rates").className).not.toContain(
      "a11y.srOnly",
    );
  });

  it("names the scroll region from the same caption", () => {
    render(<PlanTable />);
    const region = screen.getByRole("region", { name: "Repayment plans" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(screen.getByRole("table"));
  });
});

describe("Table structure", () => {
  it("resolves column, row header, and cell roles", () => {
    render(<PlanTable />);
    expect(screen.getByRole("columnheader", { name: "Plan" })).toBeVisible();
    expect(screen.getByRole("rowheader", { name: "Plan 2" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "27,295" })).toBeVisible();
  });

  it("puts a scope on every header cell", () => {
    render(<PlanTable />);
    expect(screen.getByRole("columnheader", { name: "Plan" })).toHaveAttribute(
      "scope",
      "col",
    );
    expect(screen.getByRole("rowheader", { name: "Plan 2" })).toHaveAttribute(
      "scope",
      "row",
    );
  });

  it("renders the groups as real table sections", () => {
    render(
      <Table caption="Thresholds">
        <TableHead data-testid="head">
          <TableRow>
            <TableHeaderCell scope="col">Year</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody data-testid="body">
          <TableRow>
            <TableCell>2025/26</TableCell>
          </TableRow>
        </TableBody>
        <TableFoot data-testid="foot">
          <TableRow>
            <TableCell>Source: SLC</TableCell>
          </TableRow>
        </TableFoot>
      </Table>,
    );

    expect(screen.getByTestId("head").tagName).toBe("THEAD");
    expect(screen.getByTestId("body").tagName).toBe("TBODY");
    expect(screen.getByTestId("foot").tagName).toBe("TFOOT");
  });
});

describe("Table cells", () => {
  it("gives numeric cells tabular figures and end alignment", () => {
    render(<PlanTable />);
    const cell = screen.getByRole("cell", { name: "27,295" });
    expect(cell.className).toContain("styles.numeric");
    expect(cell.className).toContain("alignStyles.end");
  });

  it("gives numeric column headers the same treatment", () => {
    render(<PlanTable />);
    const header = screen.getByRole("columnheader", { name: "Threshold" });
    expect(header.className).toContain("styles.numeric");
    expect(header.className).toContain("alignStyles.end");
  });

  it("lets an explicit align beat the numeric default", () => {
    render(
      <Table caption="Rates">
        <TableBody>
          <TableRow>
            <TableCell numeric align="center">
              6.3%
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const cell = screen.getByRole("cell", { name: "6.3%" });
    expect(cell.className).toContain("alignStyles.center");
    expect(cell.className).not.toContain("alignStyles.end");
  });

  it("leaves non-numeric cells unaligned and untabulated", () => {
    render(<PlanTable />);
    const header = screen.getByRole("columnheader", { name: "Plan" });
    expect(header.className).not.toContain("styles.numeric");
    expect(header.className).not.toContain("alignStyles.");
  });
});

describe("Table current row", () => {
  it("exposes the current row through aria-current", () => {
    render(<PlanTable />);
    const current = screen.getByRole("rowheader", {
      name: "Plan 2",
    }).parentElement;
    expect(current).toHaveAttribute("aria-current", "true");
  });

  it("does not rest the state on colour alone", () => {
    render(<PlanTable />);
    const current = screen.getByRole("rowheader", {
      name: "Plan 2",
    }).parentElement;
    // The tint is joined by heavier type, which survives a colour-blind or
    // forced-colours reading.
    expect(current?.className).toContain("styles.currentRow");
  });

  it("leaves other rows without aria-current", () => {
    render(<PlanTable />);
    const other = screen.getByRole("rowheader", {
      name: "Plan 5",
    }).parentElement;
    expect(other).not.toHaveAttribute("aria-current");
  });

  it("lets a caller announce the row as something other than true", () => {
    render(
      <Table caption="Plans">
        <TableBody>
          <TableRow current aria-current="page">
            <TableHeaderCell scope="row">Plan 2</TableHeaderCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const row = screen.getByRole("rowheader", { name: "Plan 2" }).parentElement;
    expect(row).toHaveAttribute("aria-current", "page");
    expect(row?.className).toContain("styles.currentRow");
  });
});

describe("Table sticky header", () => {
  it("stays out of the flow by default", () => {
    render(<PlanTable />);
    expect(screen.getByRole("table").className).not.toContain(
      "styles.stickyHead",
    );
  });

  it("sticks the head when asked", () => {
    render(
      <Table caption="Thresholds" stickyHeader>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Year</TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    expect(screen.getByRole("table").className).toContain("styles.stickyHead");
  });
});

describe("Table prop forwarding", () => {
  it("composes caller css last on the table and the container", () => {
    const overrides = stylex.create({
      table: { opacity: 0.9 },
      container: { opacity: 0.8 },
    });
    render(
      <Table
        caption="Rates"
        css={overrides.table}
        containerCss={overrides.container}
      >
        <TableBody>
          <TableRow>
            <TableCell>6.3%</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("table").className).toContain("overrides.table");
    expect(screen.getByRole("region").className).toContain(
      "overrides.container",
    );
  });

  it("forwards native attributes to the table", () => {
    render(
      <Table caption="Rates" id="rates">
        <TableBody>
          <TableRow>
            <TableCell>6.3%</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("id", "rates");
  });

  it("forwards a ref to the underlying table", () => {
    let node: HTMLTableElement | null = null;
    render(
      <Table
        caption="Rates"
        ref={(element) => {
          node = element;
        }}
      >
        <TableBody>
          <TableRow>
            <TableCell>6.3%</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(node).toBeInstanceOf(HTMLTableElement);
  });

  it("composes caller css on every part", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Table caption="Rates">
        <TableHead data-testid="head" css={overrides.box}>
          <TableRow data-testid="head-row" css={overrides.box}>
            <TableHeaderCell scope="col" css={overrides.box}>
              Year
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody data-testid="body" css={overrides.box}>
          <TableRow>
            <TableCell css={overrides.box}>6.3%</TableCell>
          </TableRow>
        </TableBody>
        <TableFoot data-testid="foot" css={overrides.box}>
          <TableRow>
            <TableCell>Source: SLC</TableCell>
          </TableRow>
        </TableFoot>
      </Table>,
    );

    for (const testId of ["head", "head-row", "body", "foot"]) {
      expect(screen.getByTestId(testId).className).toContain("overrides.box");
    }
    expect(screen.getByRole("columnheader").className).toContain(
      "overrides.box",
    );
    expect(screen.getByRole("cell", { name: "6.3%" }).className).toContain(
      "overrides.box",
    );
  });
});
