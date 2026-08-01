import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";

/**
 * Three rows and one numeric column — the least that still shows what the
 * component is: a ruled head, seamed rows, and figures aligned to the end. The
 * current row, the foot and the sticky head belong to the Table page, where a
 * reader can scroll them; here they would only crowd the plate.
 *
 * The caption stays sr-only. Shown, it would sit above the table as a second
 * title competing with the tile's own.
 */
export function TableSpecimen() {
  const money = new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

  return (
    <Table
      caption={t({
        en: "Repayment thresholds, 2025/26",
        zh: "还款起征点，2025/26",
      })}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Plan", zh: "还款计划" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Threshold", zh: "起征点" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableHeaderCell scope="row">
            {t({ en: "Plan 1", zh: "计划 1" })}
          </TableHeaderCell>
          <TableCell numeric>{money.format(26065)}</TableCell>
        </TableRow>
        <TableRow>
          <TableHeaderCell scope="row">
            {t({ en: "Plan 2", zh: "计划 2" })}
          </TableHeaderCell>
          <TableCell numeric>{money.format(28470)}</TableCell>
        </TableRow>
        <TableRow>
          <TableHeaderCell scope="row">
            {t({ en: "Plan 5", zh: "计划 5" })}
          </TableHeaderCell>
          <TableCell numeric>{money.format(25000)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
