import { a11y } from "@tuja/ui/primitives/a11y.stylex";

interface ChartDataTableProps {
  caption: string;
  /** The header of each column; the first names the row labels. */
  columns: readonly string[];
  rows: readonly { key: string; cells: readonly string[] }[];
}

/**
 * The chart's values as a table, read by assistive technology and never seen.
 * A table is never narrower than its content, so the 1px hidden box wraps it.
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: ChartDataTableProps) {
  return (
    <div css={a11y.srOnly}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((tableRow) => (
            <tr key={tableRow.key}>
              {tableRow.cells.map((cell, index) =>
                index === 0 ? (
                  <th key={columns[index]} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={columns[index]}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
