"use client";

import { BankIcon } from "@phosphor-icons/react/dist/ssr/Bank";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { ChartPieSliceIcon } from "@phosphor-icons/react/dist/ssr/ChartPieSlice";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { ImageIcon } from "@phosphor-icons/react/dist/ssr/Image";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link } from "@tuja/next-links/link";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Columns } from "@tuja/ui/components/columns";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { PageHeader } from "@tuja/ui/components/page-header";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { SettingList } from "@tuja/ui/components/setting-list";
import { SettingRow } from "@tuja/ui/components/setting-row";
import { Switch } from "@tuja/ui/components/switch";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useState, type ReactNode } from "react";

const RECENT_PAYEES = ["Tesco Express", "TfL", "Dishoom Shoreditch"];

const ACCOUNTS = ["Monzo Current", "Joint Bills", "Amex Gold", "Barclaycard"];

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle level={2}>{title}</CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}

function KindField() {
  const [kind, setKind] = useState<"out" | "in" | "transfer">("out");
  const labelId = useId();
  return (
    <div css={stack.tight}>
      <Text id={labelId} look="label" weight="semibold">
        {t({ en: "Type", zh: "类型" })}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        options={[
          {
            value: "out",
            label: t({ en: "Money out", zh: "支出" }),
          },
          {
            value: "in",
            label: t({ en: "Money in", zh: "收入" }),
          },
          {
            value: "transfer",
            label: t({ en: "Transfer", zh: "转账" }),
          },
        ]}
        value={kind}
        onChange={setKind}
        fullWidth
      />
    </div>
  );
}

function PayeeField() {
  const [payee, setPayee] = useState("Dishoom Shoreditch");
  const recentId = useId();
  return (
    <div css={stack.tight}>
      <TextField
        label={t({ en: "Payee", zh: "收款方" })}
        value={payee}
        autoComplete="off"
        onChange={(event) => {
          setPayee(event.target.value);
        }}
      />
      <div role="group" aria-labelledby={recentId} css={cluster.tight}>
        <Text id={recentId} as="span" look="caption" tone="muted">
          {t({ en: "Recent", zh: "最近" })}
        </Text>
        {RECENT_PAYEES.map((name) => (
          <Button
            key={name}
            type="button"
            look="outline"
            size="xs"
            onClick={() => {
              setPayee(name);
            }}
          >
            {name}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DetailsCard() {
  return (
    <FormCard title={t({ en: "Details", zh: "详情" })}>
      <KindField />
      <Columns gap="item">
        <TextField
          label={t({ en: "Amount", zh: "金额" })}
          inputMode="decimal"
          defaultValue="64.50"
          leading="£"
        />
        <TextField
          label={t({ en: "Date", zh: "日期" })}
          type="date"
          defaultValue="2026-10-31"
          error={t({
            en: "October is closed. Reopen it in Settings or pick a date in November.",
            zh: "10月已结账。请在设置中重新打开，或选择11月的日期。",
          })}
        />
      </Columns>
      <PayeeField />
      <Columns gap="item">
        <Select
          label={t({ en: "Account", zh: "账户" })}
          defaultValue="Amex Gold"
          options={ACCOUNTS.map((account) => ({
            value: account,
            label: account,
          }))}
        />
        <Select
          label={t({ en: "Category", zh: "分类" })}
          defaultValue="eatingOut"
          options={[
            {
              value: "groceries",
              label: t({ en: "Groceries", zh: "日用杂货" }),
            },
            { value: "rent", label: t({ en: "Rent", zh: "房租" }) },
            { value: "transport", label: t({ en: "Transport", zh: "交通" }) },
            {
              value: "eatingOut",
              label: t({ en: "Eating out", zh: "外出就餐" }),
            },
            { value: "bills", label: t({ en: "Bills", zh: "账单" }) },
            { value: "shopping", label: t({ en: "Shopping", zh: "购物" }) },
            { value: "income", label: t({ en: "Income", zh: "收入" }) },
            { value: "other", label: t({ en: "Other", zh: "其他" }) },
          ]}
        />
      </Columns>
    </FormCard>
  );
}

function ShareField() {
  const [share, setShare] = useState<"full" | "half" | "custom">("half");
  const labelId = useId();
  return (
    <div css={stack.tight}>
      <Text id={labelId} look="label">
        {t({ en: "Your share", zh: "你的份额" })}
      </Text>
      <SegmentedControl
        aria-labelledby={labelId}
        options={[
          { value: "full", label: "100%" },
          { value: "half", label: "50%" },
          { value: "custom", label: t({ en: "Custom", zh: "自定义" }) },
        ]}
        value={share}
        onChange={setShare}
      />
      {share === "custom" ? (
        <TextField
          label={t({ en: "Your amount", zh: "你的金额" })}
          size="sm"
          inputMode="decimal"
          leading="£"
          defaultValue="32.25"
        />
      ) : (
        <Text look="bodySmall" tone="muted" numeric>
          {share === "full"
            ? t({ en: "You pay all £64.50.", zh: "你支付全部 £64.50。" })
            : t({
                en: "You pay £32.25 of £64.50.",
                zh: "你支付 £64.50 中的 £32.25。",
              })}
        </Text>
      )}
    </div>
  );
}

function HouseholdCard() {
  const [split, setSplit] = useState(true);
  const [repeats, setRepeats] = useState(false);
  return (
    <FormCard title={t({ en: "Household", zh: "家庭" })}>
      <SettingList>
        <SettingRow
          label={t({ en: "Split with the household", zh: "与家庭分摊" })}
          description={t({
            en: "Your share counts towards your budget; the rest goes to the household.",
            zh: "你的份额计入你的预算，其余计入家庭。",
          })}
          control={
            <Switch
              value={split ? "on" : "off"}
              onChange={(next) => {
                setSplit(next === "on");
              }}
            />
          }
        >
          {split ? <ShareField /> : null}
        </SettingRow>
        <SettingRow
          label={t({ en: "Repeats", zh: "重复" })}
          description={t({
            en: "Add this transaction again on a schedule.",
            zh: "按计划再次添加这笔交易。",
          })}
          control={
            <Switch
              value={repeats ? "on" : "off"}
              onChange={(next) => {
                setRepeats(next === "on");
              }}
            />
          }
        >
          {repeats ? (
            <Select
              label={t({ en: "Every", zh: "每" })}
              size="sm"
              defaultValue="month"
              options={[
                { value: "week", label: t({ en: "Week", zh: "周" }) },
                { value: "month", label: t({ en: "Month", zh: "月" }) },
                { value: "year", label: t({ en: "Year", zh: "年" }) },
              ]}
            />
          ) : null}
        </SettingRow>
      </SettingList>
    </FormCard>
  );
}

function NoteAndReceiptCard() {
  return (
    <FormCard title={t({ en: "Note and receipt", zh: "备注与收据" })}>
      <Textarea
        label={t({ en: "Note", zh: "备注" })}
        description={t({ en: "Optional.", zh: "选填。" })}
        rows={3}
        autoGrow
        defaultValue={t({
          en: "Birthday dinner with Tom",
          zh: "和 Tom 的生日晚餐",
        })}
      />
      <div css={stack.tight}>
        <Text look="label" weight="semibold">
          {t({ en: "Receipt", zh: "收据" })}
        </Text>
        <List form="plain">
          <ListRow
            leading={<ImageIcon weight="bold" />}
            leadingShape="square"
            leadingSize="lg"
            detail="JPEG · 1.2 MB"
            actions={
              <Button
                type="button"
                look="ghost"
                size="sm"
                icon={<TrashIcon weight="bold" />}
                aria-label={t({
                  en: "Remove receipt-9-nov.jpg",
                  zh: "移除 receipt-9-nov.jpg",
                })}
              />
            }
          >
            receipt-9-nov.jpg
          </ListRow>
        </List>
        <div>
          <Button
            type="button"
            look="outline"
            size="sm"
            icon={<CameraIcon weight="bold" />}
          >
            {t({ en: "Add another photo", zh: "再添加一张照片" })}
          </Button>
        </div>
      </div>
    </FormCard>
  );
}

function NewTransaction({ backHref }: { backHref: string }) {
  return (
    <form
      css={stack.group}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <PageHeader
        title={t({ en: "New transaction", zh: "新交易" })}
        description={t({
          en: "Add a payment, income or transfer by hand.",
          zh: "手动添加一笔支出、收入或转账。",
        })}
      />
      <DetailsCard />
      <HouseholdCard />
      <NoteAndReceiptCard />
      <FormFooter>
        <Button look="ghost" href={backHref}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
        <Button type="submit" look="outline">
          {t({ en: "Save and add another", zh: "保存并继续添加" })}
        </Button>
        <Button type="submit" look="primary">
          {t({ en: "Save transaction", zh: "保存交易" })}
        </Button>
      </FormFooter>
    </form>
  );
}

export function FormScreen() {
  const locale = useLocale();
  const transactionsHref = getLocalePath(
    "/design-system/patterns/list",
    locale,
  );
  const destinations = [
    {
      href: "#overview",
      label: t({ en: "Overview", zh: "概览" }),
      icon: SquaresFourIcon,
    },
    {
      href: transactionsHref,
      label: t({ en: "Transactions", zh: "交易" }),
      icon: ReceiptIcon,
      current: true,
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
      header={
        <TabViewBrand
          name={t({ en: "Finance", zh: "财务" })}
          initials="F"
          detail={t({ en: "Household", zh: "家庭" })}
        />
      }
      css={pageColumn.settings}
    >
      <NavigationSplitView
        linkComponent={Link}
        content={{
          label: t({ en: "New transaction", zh: "新交易" }),
          node: <NewTransaction backHref={transactionsHref} />,
          back: {
            href: transactionsHref,
            label: t({ en: "Transactions", zh: "交易" }),
          },
        }}
      />
    </TabView>
  );
}
