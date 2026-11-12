"use client";

import type { Icon } from "@phosphor-icons/react";
import { ArrowDownRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowDownRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { BankIcon } from "@phosphor-icons/react/dist/ssr/Bank";
import { BooksIcon } from "@phosphor-icons/react/dist/ssr/Books";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/ssr/ChartLineUp";
import { ChartPieSliceIcon } from "@phosphor-icons/react/dist/ssr/ChartPieSlice";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { ShoppingCartIcon } from "@phosphor-icons/react/dist/ssr/ShoppingCart";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { TrainIcon } from "@phosphor-icons/react/dist/ssr/Train";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link } from "@tuja/next-links/link";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Select } from "@tuja/ui/components/select";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tuja/ui/components/table";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { flex, grow } from "@tuja/ui/primitives/flex.stylex";
import { show } from "@tuja/ui/primitives/show.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";

type Category =
  | "groceries"
  | "rent"
  | "transport"
  | "eatingOut"
  | "bills"
  | "income"
  | "shopping";

interface Transaction {
  id: string;
  day: string;
  payee: string;
  category: Category | null;
  account: string;
  amountMinor: number;
  pending?: boolean;
}

const TRANSACTIONS: readonly Transaction[] = [
  {
    id: "t1",
    day: "2026-11-10",
    payee: "Tesco Express",
    category: "groceries",
    account: "Monzo Current",
    amountMinor: -2340,
    pending: true,
  },
  {
    id: "t2",
    day: "2026-11-10",
    payee: "TfL Travel Charge",
    category: "transport",
    account: "Monzo Current",
    amountMinor: -810,
  },
  {
    id: "t3",
    day: "2026-11-09",
    payee: "SQ *BLANK STREET",
    category: null,
    account: "Amex Gold",
    amountMinor: -420,
  },
  {
    id: "t4",
    day: "2026-11-09",
    payee: "Dishoom Shoreditch",
    category: "eatingOut",
    account: "Amex Gold",
    amountMinor: -6450,
  },
  {
    id: "t5",
    day: "2026-11-08",
    payee: "Octopus Energy",
    category: "bills",
    account: "Monzo Current",
    amountMinor: -11200,
  },
  {
    id: "t6",
    day: "2026-11-07",
    payee: "Foxtons Rent",
    category: "rent",
    account: "Monzo Current",
    amountMinor: -125000,
  },
  {
    id: "t7",
    day: "2026-11-07",
    payee: "Lumen Studio Ltd",
    category: "income",
    account: "Monzo Current",
    amountMinor: 425000,
  },
  {
    id: "t8",
    day: "2026-11-06",
    payee: "PAYPAL *8842",
    category: null,
    account: "Monzo Current",
    amountMinor: -3999,
  },
  {
    id: "t9",
    day: "2026-11-05",
    payee: "Waterstones",
    category: "shopping",
    account: "Amex Gold",
    amountMinor: -2798,
  },
  {
    id: "t10",
    day: "2026-11-04",
    payee: "Sainsbury's",
    category: "groceries",
    account: "Monzo Current",
    amountMinor: -7125,
  },
  {
    id: "t11",
    day: "2026-11-03",
    payee: "AMZNMktplace",
    category: null,
    account: "Amex Gold",
    amountMinor: -1849,
  },
  {
    id: "t12",
    day: "2026-11-02",
    payee: "Thames Water",
    category: "bills",
    account: "Monzo Current",
    amountMinor: -4130,
  },
];

const ACCOUNTS = ["Monzo Current", "Amex Gold", "Marcus Savings"];

const CATEGORY_ICONS: Record<Category, Icon> = {
  groceries: ShoppingCartIcon,
  rent: HouseIcon,
  transport: TrainIcon,
  eatingOut: ForkKnifeIcon,
  bills: LightningIcon,
  income: BriefcaseIcon,
  shopping: BooksIcon,
};

function useCategoryNames(): Record<Category, string> {
  return {
    groceries: t({ en: "Groceries", zh: "日用杂货" }),
    rent: t({ en: "Rent", zh: "房租" }),
    transport: t({ en: "Transport", zh: "交通" }),
    eatingOut: t({ en: "Eating out", zh: "外出就餐" }),
    bills: t({ en: "Bills", zh: "账单" }),
    income: t({ en: "Income", zh: "收入" }),
    shopping: t({ en: "Shopping", zh: "购物" }),
  };
}

function useFormatters() {
  const locale = useLocale() === "zh" ? "zh-CN" : "en-GB";
  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "GBP",
  });
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return {
    amount: (minor: number) =>
      `${minor < 0 ? "−" : "+"}${money.format(Math.abs(minor) / 100)}`,
    day: (day: string) => date.format(new Date(`${day}T00:00:00Z`)),
  };
}

function MonthSwitcher() {
  return (
    <>
      <Button
        href="#2026-10"
        look="outline"
        size="sm"
        icon={<CaretLeftIcon weight="bold" />}
        aria-label={t({ en: "October", zh: "10月" })}
      />
      <Text look="label" weight="semibold">
        {t({ en: "November 2026", zh: "2026年11月" })}
      </Text>
      <Button
        look="outline"
        size="sm"
        icon={<CaretRightIcon weight="bold" />}
        aria-label={t({ en: "December", zh: "12月" })}
        disabled
      />
    </>
  );
}

function CategoryPicker({ transaction }: { transaction: Transaction }) {
  const names = useCategoryNames();
  return (
    <Select
      label={`${t({ en: "Category for ", zh: "分类：" })}${transaction.payee}`}
      labelHidden
      size="sm"
      placeholder={t({ en: "Pick a category", zh: "选择分类" })}
      options={Object.entries(names).map(([value, label]) => ({
        value,
        label,
      }))}
    />
  );
}

function Amount({
  minor,
  look,
}: {
  minor: number;
  look?: "body" | "bodySmall";
}) {
  const format = useFormatters();
  return (
    <Text as="span" look={look} tone={minor > 0 ? "success" : "default"}>
      {format.amount(minor)}
    </Text>
  );
}

function TransactionTable() {
  const names = useCategoryNames();
  const format = useFormatters();
  const pending = t({ en: "Pending", zh: "处理中" });
  return (
    <Table
      caption={t({
        en: "Transactions in November 2026",
        zh: "2026年11月的交易",
      })}
      verticalAlign="middle"
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Date", zh: "日期" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col">
            {t({ en: "Payee", zh: "收款方" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col">
            {t({ en: "Category", zh: "分类" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col">
            {t({ en: "Account", zh: "账户" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Amount", zh: "金额" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {TRANSACTIONS.map((transaction) => (
          <TableRow
            key={transaction.id}
            intent={transaction.category === null ? "warning" : undefined}
          >
            <TableCell>{format.day(transaction.day)}</TableCell>
            <TableCell>
              <span css={cluster.tight}>
                {transaction.payee}
                {transaction.pending ? (
                  <Badge size="sm">{pending}</Badge>
                ) : null}
              </span>
            </TableCell>
            <TableCell>
              {transaction.category === null ? (
                <CategoryPicker transaction={transaction} />
              ) : (
                <Badge size="sm" intent="neutral">
                  {names[transaction.category]}
                </Badge>
              )}
            </TableCell>
            <TableCell>{transaction.account}</TableCell>
            <TableCell numeric>
              <Amount minor={transaction.amountMinor} look="bodySmall" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TransactionList() {
  const names = useCategoryNames();
  const format = useFormatters();
  const pending = t({ en: "Pending", zh: "处理中" });
  const needsCategory = t({ en: "Needs a category", zh: "待分类" });
  return (
    <List form="plain">
      {TRANSACTIONS.map((transaction) => {
        const CategoryIcon =
          transaction.category === null
            ? QuestionIcon
            : CATEGORY_ICONS[transaction.category];
        return (
          <ListRow
            key={transaction.id}
            href={`#${transaction.id}`}
            leading={<CategoryIcon weight="bold" />}
            leadingShape="circle"
            detail={
              <MetaLine
                facts={[
                  format.day(transaction.day),
                  transaction.category === null
                    ? needsCategory
                    : names[transaction.category],
                  transaction.pending ? pending : null,
                ]}
              />
            }
            value={<Amount minor={transaction.amountMinor} />}
            valueDetail={transaction.account}
            below={
              transaction.category === null ? (
                <CategoryPicker transaction={transaction} />
              ) : null
            }
          >
            {transaction.payee}
          </ListRow>
        );
      })}
    </List>
  );
}

function Filters() {
  const names = useCategoryNames();
  return (
    <div css={cluster.tight}>
      <TextField
        label={t({ en: "Search by payee", zh: "按收款方搜索" })}
        labelHidden
        placeholder={t({ en: "Search payees", zh: "搜索收款方" })}
        size="sm"
        leading={<MagnifyingGlassIcon weight="bold" />}
        css={grow._1}
      />
      <div css={row.tight}>
        <Select
          label={t({ en: "Account", zh: "账户" })}
          labelHidden
          size="sm"
          defaultValue=""
          options={[
            { value: "", label: t({ en: "All accounts", zh: "全部账户" }) },
            ...ACCOUNTS.map((account) => ({ value: account, label: account })),
          ]}
        />
        <Select
          label={t({ en: "Category", zh: "分类" })}
          labelHidden
          size="sm"
          defaultValue=""
          options={[
            { value: "", label: t({ en: "All categories", zh: "全部分类" }) },
            ...Object.entries(names).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>
    </div>
  );
}

function Transactions() {
  const locale = useLocale();
  return (
    <div css={stack.group}>
      <PageHeader
        title={t({ en: "Transactions", zh: "交易" })}
        description={t({
          en: "Review this month and fix what the bank sync could not categorise.",
          zh: "回顾本月的交易，并补上银行同步没能分类的那些。",
        })}
        actions={
          <>
            <MonthSwitcher />
            <Button
              href={getLocalePath("/design-system/patterns/form", locale)}
              look="primary"
              size="sm"
              icon={<PlusIcon weight="bold" />}
            >
              {t({ en: "Add transaction", zh: "添加交易" })}
            </Button>
          </>
        }
      />
      <StatGroup>
        <Stat
          label={t({ en: "Spent", zh: "支出" })}
          value="£2,184.20"
          detail={t({ en: "£312 less than October", zh: "比10月少 £312" })}
          icon={<ArrowDownRightIcon weight="bold" />}
        />
        <Stat
          label={t({ en: "Income", zh: "收入" })}
          value="£4,250.00"
          detail={t({ en: "1 payment this month", zh: "本月 1 笔" })}
          icon={<ArrowUpRightIcon weight="bold" />}
        />
        <Stat
          label={t({ en: "Net", zh: "净额" })}
          value="+£2,065.80"
          detail={t({ en: "Income minus spending", zh: "收入减去支出" })}
          intent="success"
          icon={<ChartLineUpIcon weight="bold" />}
        />
        <Stat
          label={t({ en: "Needs a category", zh: "待分类" })}
          value="3"
          detail={t({
            en: "Pick one on each row below",
            zh: "在下方对应行里选择分类",
          })}
          intent="warning"
          icon={<WarningCircleIcon weight="bold" />}
        />
      </StatGroup>
      <Card>
        <Filters />
        <div css={show.wide}>
          <TransactionTable />
        </div>
        <div css={show.narrow}>
          <TransactionList />
        </div>
        <div css={[flex.between, cluster.tight]}>
          <Text look="caption" tone="muted">
            {t({
              en: "Showing 12 of 86 transactions",
              zh: "显示 86 笔交易中的 12 笔",
            })}
          </Text>
          <Button look="outline" size="sm">
            {t({ en: "Load more", zh: "加载更多" })}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ListScreen() {
  const locale = useLocale();
  const destinations = [
    {
      href: "#overview",
      label: t({ en: "Overview", zh: "概览" }),
      icon: SquaresFourIcon,
    },
    {
      href: getLocalePath("/design-system/patterns/list", locale),
      label: t({ en: "Transactions", zh: "交易" }),
      icon: ReceiptIcon,
      current: true,
      count: 3,
    },
    {
      href: "#accounts",
      label: t({ en: "Accounts", zh: "账户" }),
      icon: BankIcon,
    },
    {
      href: "#analytics",
      label: t({ en: "Analytics", zh: "分析" }),
      icon: ChartPieSliceIcon,
    },
    {
      href: "#settings",
      label: t({ en: "Settings", zh: "设置" }),
      icon: GearSixIcon,
    },
  ];
  return (
    <TabView
      label={t({ en: "Finance", zh: "财务" })}
      items={destinations}
      linkComponent={Link}
      sidebarToggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
      header={
        <TabViewBrand
          name={t({ en: "Finance", zh: "财务" })}
          initials="F"
          detail={t({ en: "Household", zh: "家庭" })}
        />
      }
    >
      <NavigationStack label={t({ en: "Transactions", zh: "交易" })}>
        <Transactions />
      </NavigationStack>
    </TabView>
  );
}
