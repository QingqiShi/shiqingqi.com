"use client";

import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Table } from "@tuja/ui/components/table";
import { TableBody } from "@tuja/ui/components/table-body";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableHead } from "@tuja/ui/components/table-head";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { TableRow } from "@tuja/ui/components/table-row";
import { Text } from "@tuja/ui/components/text";
import { show } from "@tuja/ui/primitives/show.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { GUARDRAILS } from "../guardrails.ts";
import type { PositionView } from "../views/load-portfolio.ts";
import { formatMoney } from "./format-money.ts";
import { formatPercent } from "./format-percent.ts";
import { LockBadge } from "./lock-badge.tsx";
import { SignedMoney } from "./signed-money.tsx";

function PositionRow({ position }: { position: PositionView }) {
  const facts = t({
    en: "{n} shares · {weight} · avg {cost} · last {last}",
    zh: "{n} 股 · {weight} · 均价 {cost} · 现价 {last}",
  })
    .replace("{n}", position.quantity.toLocaleString("en-GB"))
    .replace("{weight}", formatPercent(position.weightPct))
    .replace("{cost}", position.averageCostText)
    .replace("{last}", position.lastText);
  return (
    <ListRow
      wrap
      detail={position.name}
      value={formatMoney(position.valueGbp)}
      valueDetail={
        <SignedMoney
          amountGbp={position.pnlGbp}
          pct={position.pnlPct}
          look="caption"
        />
      }
      extra={
        <>
          <Text as="span" look="caption" tone="muted" numeric>
            {facts}
          </Text>
          <span>
            <LockBadge {...position} />
          </span>
        </>
      }
    >
      {position.symbol}
    </ListRow>
  );
}

function PositionTableRow({ position }: { position: PositionView }) {
  return (
    <TableRow>
      <TableHeaderCell scope="row">
        <span css={stack.text}>
          <Text as="span" look="bodySmall" weight="semibold">
            {position.symbol}
          </Text>
          <Text as="span" look="caption" tone="muted">
            {position.name}
          </Text>
        </span>
      </TableHeaderCell>
      <TableCell numeric>{position.quantity.toLocaleString("en-GB")}</TableCell>
      <TableCell numeric>{position.averageCostText}</TableCell>
      <TableCell numeric>{position.lastText}</TableCell>
      <TableCell numeric>{formatMoney(position.valueGbp)}</TableCell>
      <TableCell numeric>{formatPercent(position.weightPct)}</TableCell>
      <TableCell numeric>
        <SignedMoney amountGbp={position.pnlGbp} pct={position.pnlPct} />
      </TableCell>
      <TableCell>
        <LockBadge {...position} />
      </TableCell>
    </TableRow>
  );
}

/** The positions: a table where the view is wide, a list of rows where it is narrow. */
export function PositionsView({
  positions,
}: {
  positions: readonly PositionView[];
}) {
  const caption = t({ en: "Positions", zh: "持仓" });
  return (
    <>
      <div css={show.wide}>
        <Table caption={caption}>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">
                {t({ en: "Stock", zh: "股票" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Shares", zh: "股数" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Avg cost", zh: "均价" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Last", zh: "现价" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Value", zh: "市值" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Weight", zh: "权重" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col" numeric>
                {t({ en: "Profit/loss", zh: "盈亏" })}
              </TableHeaderCell>
              <TableHeaderCell scope="col">
                {t({ en: "{n}-day hold", zh: "{n} 天持有期" }).replace(
                  "{n}",
                  String(GUARDRAILS.minHoldDays),
                )}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((position) => (
              <PositionTableRow key={position.symbol} position={position} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div css={show.narrow}>
        <List aria-label={caption}>
          {positions.map((position) => (
            <PositionRow key={position.symbol} position={position} />
          ))}
        </List>
      </div>
    </>
  );
}
