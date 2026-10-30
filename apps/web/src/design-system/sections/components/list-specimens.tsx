"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { List } from "@tuja/ui/components/list";
import { ListRow, type ListRowLinkProps } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
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

/** Settings that each open a page of their own, with a count or a state. */
export function SettingsList() {
  const [opened, setOpened] = useState<string | null>(null);
  const rows = [
    {
      id: "accounts",
      name: t({ en: "Accounts", zh: "账户" }),
      detail: t({ en: "4 connected", zh: "已连接4个" }),
      badge: null,
    },
    {
      id: "categories",
      name: t({ en: "Categories", zh: "分类" }),
      detail: t({
        en: "18 categories in 5 groups",
        zh: "5个分组中的18个分类",
      }),
      badge: null,
    },
    {
      id: "rules",
      name: t({ en: "Rules", zh: "规则" }),
      detail: t({ en: "Sort new transactions", zh: "整理新交易" }),
      badge: (
        <Badge intent="warning" size="sm">
          {t({ en: "2 to review", zh: "2条待查看" })}
        </Badge>
      ),
    },
  ];
  return (
    <div css={styles.frame}>
      <List aria-label={t({ en: "Settings", zh: "设置" })}>
        {rows.map((row) => (
          <ListRow
            key={row.id}
            detail={row.detail}
            trailing={row.badge}
            onClick={() => {
              setOpened(row.name);
            }}
          >
            {row.name}
          </ListRow>
        ))}
      </List>
      <Text look="caption" tone="muted" aria-live="polite">
        {opened ?? t({ en: "Nothing opened yet", zh: "尚未打开任何项" })}
      </Text>
    </div>
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

/** People in a shared budget, each with what they owe or are owed. */
export function PeopleList() {
  const money = new Intl.NumberFormat(useLocale(), {
    style: "currency",
    currency: "GBP",
    signDisplay: "exceptZero",
  });
  const isOwed = t({ en: "Is owed", zh: "应收" });
  const owes = t({ en: "Owes", zh: "应付" });
  const settled = t({ en: "Settled up", zh: "已结清" });
  const people = [
    { name: "Ada Lovelace", balance: 42.5 },
    { name: "Alan Turing", balance: -18 },
    { name: "Grace Hopper", balance: 0 },
  ];
  return (
    <div css={styles.frame}>
      <List aria-label={t({ en: "Members", zh: "成员" })}>
        {people.map((person) => (
          <ListRow
            key={person.name}
            href={`#${person.name}`}
            linkComponent={DemoLink}
            leading={<Avatar name={person.name} size="sm" />}
            detail={
              person.balance > 0 ? isOwed : person.balance < 0 ? owes : settled
            }
            trailing={
              <span css={[typeRole.body, typeModifier.numeric]}>
                {money.format(person.balance)}
              </span>
            }
          >
            {person.name}
          </ListRow>
        ))}
      </List>
    </div>
  );
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

/** Accounts beside the one that is open, as a wide screen lays them out. */
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
      detail: t({ en: "Updated 3 days ago", zh: "3天前已更新" }),
    },
  ];
  const [openId, setOpenId] = useState(accounts[0]?.id);
  const open = accounts.find((account) => account.id === openId);
  return (
    <div css={styles.split}>
      <div css={styles.splitList}>
        <List aria-label={t({ en: "Accounts", zh: "账户" })}>
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
