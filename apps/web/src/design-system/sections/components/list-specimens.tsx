"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Card, CardTitle } from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { List } from "@tuja/ui/components/list";
import { ListRow, type ListRowLinkProps } from "@tuja/ui/components/list-row";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { createContext, use, useState } from "react";

const FollowContext = createContext<(href: string) => void>(() => undefined);

/**
 * The link Slot of the demo lists: it follows a row by making it current, so
 * the page stays where it is, the way a client-side router keeps it.
 */
function DemoLink({ onClick, ...props }: ListRowLinkProps) {
  const follow = use(FollowContext);
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        follow(props.href);
      }}
    />
  );
}

/** Saved reports, each a page; the one being read is current. */
export function ReportList() {
  const [current, setCurrent] = useState("#march");
  const rows = [
    {
      href: "#march",
      name: t({ en: "March spending", zh: "三月支出" }),
      detail: t({ en: "Spending by category", zh: "按分类统计支出" }),
      badge: null,
    },
    {
      href: "#weekly",
      name: t({ en: "Weekly summary", zh: "每周汇总" }),
      detail: t({ en: "Income and spending", zh: "收入与支出" }),
      badge: (
        <Badge intent="neutral" size="sm">
          {t({ en: "Last week", zh: "上周" })}
        </Badge>
      ),
    },
    {
      href: "#net-worth",
      name: t({ en: "Net worth", zh: "净资产" }),
      detail: t({ en: "Every account, over a year", zh: "全部账户，一年内" }),
      badge: null,
    },
  ];
  return (
    <FollowContext value={setCurrent}>
      <div css={styles.frame}>
        <List aria-label={t({ en: "Reports", zh: "报告" })}>
          {rows.map((row) => (
            <ListRow
              key={row.href}
              href={row.href}
              linkComponent={DemoLink}
              detail={row.detail}
              trailing={row.badge}
              aria-current={row.href === current ? "page" : undefined}
            >
              {row.name}
            </ListRow>
          ))}
        </List>
      </div>
    </FollowContext>
  );
}

/**
 * Spending of a week, some rows with a detail line and one with a note: the
 * names start on one line, the icons stay level with the first two lines,
 * and the amounts line up at their end.
 */
export function SpendingList() {
  const money = useMoney();
  const rows = [
    {
      id: "groceries",
      emoji: "🛒",
      name: t({ en: "Groceries", zh: "日用杂货" }),
      detail: t({ en: "Market Street · Card", zh: "市场街 · 银行卡" }),
      amount: -42.1,
    },
    {
      id: "coffee",
      emoji: "☕",
      name: t({ en: "Coffee", zh: "咖啡" }),
      amount: -3.2,
    },
    {
      id: "train",
      emoji: "🚆",
      name: t({ en: "Train to Leeds", zh: "去利兹的火车" }),
      detail: t({ en: "Return · Card", zh: "往返 · 银行卡" }),
      share: 29,
      note: t({ en: "Shared with Alan Turing", zh: "与 Alan Turing 分摊" }),
      amount: -58,
    },
  ];
  const shareText = t({ en: "Your share {amount}", zh: "你的份额 {amount}" });
  return (
    <div css={styles.frame}>
      <List aria-label={t({ en: "Spending", zh: "支出" })}>
        {rows.map((row) => (
          <ListRow
            key={row.id}
            href={`#${row.id}`}
            linkComponent={DemoLink}
            leading={row.emoji}
            leadingShape="circle"
            detail={row.detail}
            extra={row.note}
            value={money.signed(row.amount)}
            valueDetail={
              row.share === undefined
                ? undefined
                : shareText.replace("{amount}", money.plain(row.share))
            }
          >
            {row.name}
          </ListRow>
        ))}
      </List>
    </div>
  );
}

/**
 * The entries of an account inside its card: a plain list, each row with
 * the amount over the balance after it.
 */
export function LedgerList() {
  const money = useMoney();
  const rows = [
    {
      id: "salary",
      emoji: "💼",
      name: t({ en: "Salary", zh: "工资" }),
      amount: 2400,
      balance: 3180.4,
    },
    {
      id: "rent",
      emoji: "🏠",
      name: t({ en: "Rent", zh: "房租" }),
      detail: t({ en: "Standing order", zh: "定期转账" }),
      amount: -950,
      balance: 780.4,
    },
    {
      id: "books",
      emoji: "📚",
      name: t({ en: "Books", zh: "书籍" }),
      amount: -24.99,
      balance: 755.41,
    },
  ];
  return (
    <Card css={styles.frame}>
      <CardTitle>{t({ en: "Current account", zh: "活期账户" })}</CardTitle>
      <List form="plain" aria-label={t({ en: "Entries", zh: "账目" })}>
        {rows.map((row) => (
          <ListRow
            key={row.id}
            href={`#${row.id}`}
            linkComponent={DemoLink}
            leading={row.emoji}
            leadingShape="circle"
            detail={row.detail}
            value={money.signed(row.amount)}
            valueDetail={money.plain(row.balance)}
          >
            {row.name}
          </ListRow>
        ))}
      </List>
    </Card>
  );
}

function useMoney() {
  const locale = useLocale();
  const signed = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "GBP",
    signDisplay: "exceptZero",
  });
  const plain = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "GBP",
  });
  return {
    signed: (amount: number) => signed.format(amount),
    plain: (amount: number) => plain.format(amount),
  };
}

/** Category groups in the order they show, each moved with two buttons. */
export function ReorderList() {
  const names: Record<string, string> = {
    home: t({ en: "Home", zh: "居家" }),
    food: t({ en: "Food and drink", zh: "餐饮" }),
    travel: t({ en: "Travel", zh: "出行" }),
  };
  const [order, setOrder] = useState(["home", "food", "travel"]);
  const moveUpLabel = t({ en: "Move up", zh: "上移" });
  const moveDownLabel = t({ en: "Move down", zh: "下移" });

  function move(from: number, to: number) {
    setOrder((current) => {
      const next = [...current];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  }

  return (
    <div css={styles.frame}>
      <List aria-label={t({ en: "Category groups", zh: "分类分组" })}>
        {order.map((id, index) => (
          <ListRow
            key={id}
            onClick={() => undefined}
            actions={
              <>
                <Button
                  size="sm"
                  look="ghost"
                  icon={<ArrowUpIcon weight="bold" />}
                  aria-label={`${moveUpLabel}: ${names[id]}`}
                  disabled={index === 0}
                  onClick={() => {
                    move(index, index - 1);
                  }}
                />
                <Button
                  size="sm"
                  look="ghost"
                  icon={<ArrowDownIcon weight="bold" />}
                  aria-label={`${moveDownLabel}: ${names[id]}`}
                  disabled={index === order.length - 1}
                  onClick={() => {
                    move(index, index + 1);
                  }}
                />
              </>
            }
          >
            {names[id]}
          </ListRow>
        ))}
      </List>
    </div>
  );
}

/** Spending with no category yet, each picked in place under its row. */
export function UncategorisedList() {
  const categoryLabel = t({ en: "Category", zh: "分类" });
  const placeholder = t({ en: "No category", zh: "未分类" });
  const categories = [
    { value: "food", label: t({ en: "Food and drink", zh: "餐饮" }) },
    { value: "travel", label: t({ en: "Travel", zh: "出行" }) },
    { value: "home", label: t({ en: "Home", zh: "居家" }) },
  ];
  const spending = [
    {
      id: "coffee",
      name: t({ en: "Corner Café", zh: "街角咖啡馆" }),
      value: "-£3.40",
    },
    {
      id: "train",
      name: t({ en: "Northern Rail", zh: "北方铁路" }),
      value: "-£24.80",
    },
  ];
  return (
    <div css={styles.frame}>
      <List aria-label={t({ en: "To categorise", zh: "待分类" })}>
        {spending.map((item) => (
          <ListRow
            key={item.id}
            href="#"
            value={item.value}
            below={
              <Select
                size="sm"
                label={`${categoryLabel}: ${item.name}`}
                labelHidden
                placeholder={placeholder}
                options={categories}
              />
            }
          >
            {item.name}
          </ListRow>
        ))}
      </List>
    </div>
  );
}

/**
 * Accounts beside the one that is open, as a wide screen lays them out: a
 * dense list, as a sidebar is.
 */
export function ListDetailList() {
  const accounts = [
    {
      id: "current",
      name: t({ en: "Current account", zh: "活期账户" }),
      detail: t({ en: "Updated today", zh: "今天已更新" }),
    },
    {
      id: "savings",
      name: t({ en: "Savings", zh: "储蓄账户" }),
      detail: t({ en: "Updated yesterday", zh: "昨天已更新" }),
    },
    {
      id: "credit",
      name: t({ en: "Credit card", zh: "信用卡" }),
      detail: t({ en: "Updated 3 days ago", zh: "3 天前已更新" }),
    },
  ];
  const [openId, setOpenId] = useState(accounts[0]?.id);
  const open = accounts.find((account) => account.id === openId);
  return (
    <div css={styles.split}>
      <div css={styles.splitList}>
        <List density="compact" aria-label={t({ en: "Accounts", zh: "账户" })}>
          {accounts.map((account) => (
            <ListRow
              key={account.id}
              caret={false}
              detail={account.detail}
              aria-current={account.id === openId ? "true" : undefined}
              onClick={() => {
                setOpenId(account.id);
              }}
            >
              {account.name}
            </ListRow>
          ))}
        </List>
      </div>
      <div css={[cardSurface.base, styles.pane]}>
        <Text look="body" weight="semibold">
          {open?.name}
        </Text>
        <Text look="caption" tone="muted">
          {open?.detail}
        </Text>
      </div>
    </div>
  );
}

const styles = stylex.create({
  frame: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    inlineSize: "100%",
    maxInlineSize: space._14,
  },
  split: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "minmax(0, 2fr) minmax(0, 3fr)",
    },
    gap: rhythm.inline,
    inlineSize: "100%",
  },
  splitList: {
    alignSelf: "start",
  },
  pane: {
    display: "flex",
    flexDirection: "column",
    padding: space._3,
    color: color.fg,
  },
});
