import { Badge } from "@tuja/ui/components/badge";
import { Breadcrumb } from "@tuja/ui/components/breadcrumb";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Columns } from "@tuja/ui/components/columns";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import type { SplitViewLinkProps } from "@tuja/ui/components/navigation-split-view";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { OptionCardGroup } from "@tuja/ui/components/option-card-group";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Popover } from "@tuja/ui/components/popover";
import { Section } from "@tuja/ui/components/section";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Select } from "@tuja/ui/components/select";
import { SettingList } from "@tuja/ui/components/setting-list";
import { SettingRow } from "@tuja/ui/components/setting-row";
import { Sheet } from "@tuja/ui/components/sheet";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { Switch } from "@tuja/ui/components/switch";
import type {
  TabLinkStatusProps,
  TabViewItem,
} from "@tuja/ui/components/tab-view";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import { Table } from "@tuja/ui/components/table";
import { TableBody } from "@tuja/ui/components/table-body";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableHead } from "@tuja/ui/components/table-head";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { TableRow } from "@tuja/ui/components/table-row";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { useToast } from "@tuja/ui/components/toast-provider";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";

// The index prints the body of each method below, not this file. The
// declarations here stand for what a screen has already: Phosphor icons,
// `Link` and `LinkStatus` from `@tuja/next-links/link`, its own data and its
// own state.
type Icon = TabViewItem["icon"];
declare const PlusIcon: Icon;
declare const TrashIcon: Icon;
declare const SunIcon: Icon;
declare const CheckSquareIcon: Icon;
declare const GearSixIcon: Icon;
declare const ListChecksIcon: Icon;
declare const ShoppingCartIcon: Icon;
declare const ArrowDownRightIcon: Icon;
declare const DotsThreeIcon: Icon;
declare const Link: ComponentType<SplitViewLinkProps>;
declare const LinkStatus: ComponentType<TabLinkStatusProps>;
declare const children: ReactNode;
declare const sectionSkeleton: ReactElement;
declare const transactions: readonly {
  id: string;
  payee: string;
  category: string | null;
  account: string;
  amount: string;
}[];
declare const CATEGORIES: readonly { value: string; label: string }[];
declare const close: () => void;
declare const restore: () => void;
declare const isOpen: boolean;

/**
 * One usage per component, keyed by the component's name. Each body must
 * type-check, so a change to a prop breaks `build:tsc` here before the index
 * can teach it.
 */
export const examples = {
  TabView() {
    return (
      <TabView
        label="Assistant"
        items={[
          { href: "/today", label: "Today", icon: SunIcon, current: true },
          { href: "/todos", label: "To-dos", icon: CheckSquareIcon, count: 17 },
          { href: "/settings", label: "Settings", icon: GearSixIcon },
        ]}
        header={
          <TabViewBrand name="Assistant" initials="Qi" detail="2 mailboxes" />
        }
        css={pageColumn.list}
      >
        {children}
      </TabView>
    );
  },

  NavigationSplitView() {
    return (
      <NavigationSplitView
        css={pageColumn.settings}
        linkComponent={Link}
        linkStatus={LinkStatus}
        skeleton={sectionSkeleton}
        sidebar={{
          stacked: "page",
          href: "/settings",
          label: "Settings",
          node: <nav aria-label="Settings">{children}</nav>,
        }}
        content={{
          label: "Household",
          back: { href: "/settings", label: "Settings" },
          node: children,
        }}
      />
    );
  },

  HeaderFooterLayout() {
    return (
      <HeaderFooterLayout
        pageColumn
        headerStart={
          <Button href="/" look="ghost" size="sm">
            Home
          </Button>
        }
        footer={
          <Text look="caption" tone="muted">
            © 2026
          </Text>
        }
      >
        {children}
      </HeaderFooterLayout>
    );
  },

  PageHeader() {
    return (
      <PageHeader
        eyebrow="Finance · Household"
        title="Transactions"
        description="Review this month and fix what the bank sync could not categorise."
        actions={
          <Button look="primary" size="sm" icon={<PlusIcon weight="bold" />}>
            Add transaction
          </Button>
        }
      />
    );
  },

  StatGroup() {
    return (
      <StatGroup>
        <Stat
          label="Spent"
          value="£2,184.20"
          detail="£312 less than October"
          icon={<ArrowDownRightIcon weight="bold" />}
        />
        <Stat label="Net" value="+£2,065.80" intent="success" />
        <Stat label="Needs a category" value="3" intent="warning" />
      </StatGroup>
    );
  },

  SettingList() {
    const [enabled, setEnabled] = useState(true);
    return (
      <Card>
        <SettingList>
          <SettingRow
            label="Send a morning report"
            description="Get the report by email each day."
            control={
              <Switch
                value={enabled ? "on" : "off"}
                onChange={(next) => {
                  setEnabled(next === "on");
                }}
              />
            }
          />
          <SettingRow
            label="Delivery time"
            control={
              <Select
                size="sm"
                defaultValue="07:30"
                options={[{ value: "07:30", label: "07:30" }]}
              />
            }
          />
        </SettingList>
      </Card>
    );
  },

  FormFooter() {
    return (
      <form css={stack.group}>
        <TextField label="Folder name" defaultValue="Finance/Receipts" />
        <FormFooter sticky>
          <Button look="ghost">Cancel</Button>
          <Button look="primary" type="submit">
            Save changes
          </Button>
        </FormFooter>
      </form>
    );
  },

  EmptyState() {
    return (
      <EmptyState
        icon={<ListChecksIcon weight="bold" />}
        title="No rules yet"
        description="Make a rule from any transaction, and the bank sync files the next one for you."
        action={
          <Button look="outline" size="sm" icon={<PlusIcon weight="bold" />}>
            Add a rule
          </Button>
        }
      />
    );
  },

  Columns() {
    return (
      <Columns ratio="2:1">
        <Card>{children}</Card>
        <div css={stack.group}>
          <Card>{children}</Card>
          <Card>{children}</Card>
        </div>
      </Columns>
    );
  },

  Card() {
    return (
      <Card>
        <CardHeader action={<Badge size="sm">Beta</Badge>}>
          <CardTitle level={2}>Morning report</CardTitle>
          <CardDescription>One summary of the last day’s mail.</CardDescription>
        </CardHeader>
        <Text look="bodySmall">{children}</Text>
      </Card>
    );
  },

  Section() {
    return (
      <Section
        level={2}
        title="Recently done"
        actions={
          <Button href="/todos/done" look="ghost" size="sm">
            See all
          </Button>
        }
      >
        {children}
      </Section>
    );
  },

  Disclosure() {
    return (
      <Disclosure look="card" summary="Lost your passkey?">
        <Text look="bodySmall">Ask another member for a recovery link.</Text>
      </Disclosure>
    );
  },

  List() {
    return (
      <List>
        {transactions.map((transaction) => (
          <ListRow
            key={transaction.id}
            href={`/transactions/${transaction.id}`}
            leading={<ShoppingCartIcon weight="bold" />}
            leadingShape="circle"
            detail={
              <MetaLine
                facts={[
                  transaction.category ?? "Needs a category",
                  transaction.account,
                ]}
              />
            }
            value={transaction.amount}
          >
            {transaction.payee}
          </ListRow>
        ))}
      </List>
    );
  },

  ListRow() {
    return (
      <ListRow
        onClick={close}
        value="−£4.20"
        below={
          <Select
            label="Category"
            labelHidden
            size="sm"
            placeholder="Choose a category"
            options={CATEGORIES}
          />
        }
      >
        SQ *BLANK STREET
      </ListRow>
    );
  },

  Table() {
    return (
      <Table caption="Transactions" stickyHeader>
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">Payee</TableHeaderCell>
            <TableHeaderCell scope="col" numeric>
              Amount
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableHeaderCell scope="row">{transaction.payee}</TableHeaderCell>
              <TableCell numeric>{transaction.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },

  MetaLine() {
    return (
      <MetaLine
        facts={[
          "Groceries",
          "Monzo Current",
          <Badge key="pending" size="sm">
            Pending
          </Badge>,
        ]}
      />
    );
  },

  Badge() {
    return (
      <Badge intent="warning" size="sm">
        Overdue
      </Badge>
    );
  },

  Text() {
    return (
      <Text as="p" look="bodySmall" tone="muted">
        What came in overnight, and what needs you.
      </Text>
    );
  },

  Heading() {
    return (
      <Heading level={2} look="h4">
        Needs you
      </Heading>
    );
  },

  TextField() {
    return (
      <TextField
        label="Email"
        type="email"
        description="We send the report here."
        error={undefined}
        autoComplete="email"
      />
    );
  },

  Select() {
    return (
      <Select
        label="Category"
        placeholder="Choose a category"
        options={CATEGORIES}
        defaultValue=""
      />
    );
  },

  Switch() {
    return (
      <Switch
        label="Spending arrives as a positive amount"
        description="Most banks show purchases as negative."
        defaultValue="off"
      />
    );
  },

  Checkbox() {
    const [paused, setPaused] = useState(false);
    return (
      <Checkbox
        label="Paused"
        description="A paused rule adds nothing until you resume it."
        checked={paused}
        onChange={(event) => {
          setPaused(event.target.checked);
        }}
      />
    );
  },

  SegmentedControl() {
    const [kind, setKind] = useState<"expense" | "income">("expense");
    return (
      <SegmentedControl
        aria-label="Kind"
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
        value={kind}
        onChange={setKind}
      />
    );
  },

  OptionCardGroup() {
    const [plan, setPlan] = useState<"free" | "pro">("pro");
    return (
      <OptionCardGroup
        aria-label="Plan"
        options={[
          { value: "free", label: "Free", description: "One project." },
          {
            value: "pro",
            label: "Pro",
            description: "Every project, and support.",
          },
        ]}
        value={plan}
        onChange={setPlan}
      />
    );
  },

  Button() {
    return (
      <div css={row.inline}>
        <Button look="ghost">Cancel</Button>
        <Button look="primary" type="submit" icon={<PlusIcon weight="bold" />}>
          Add
        </Button>
        <Button look="danger" size="sm" icon={<TrashIcon weight="bold" />}>
          Delete all data
        </Button>
      </div>
    );
  },

  MenuButton() {
    return (
      <MenuButton
        buttonProps={{
          icon: <DotsThreeIcon weight="bold" />,
          look: "ghost",
          size: "sm",
        }}
        menuContent={
          <div css={stack.rows}>
            <MenuItem onClick={close}>Rename</MenuItem>
            <MenuItem intent="danger" onClick={close}>
              Delete
            </MenuItem>
          </div>
        }
      >
        More
      </MenuButton>
    );
  },

  NavList() {
    return (
      <nav aria-label="Reports">
        <NavList>
          <NavGroup label="November">
            <NavLink href="/reports/10" current>
              10 November
            </NavLink>
            <NavLink href="/reports/9">9 November</NavLink>
          </NavGroup>
        </NavList>
      </nav>
    );
  },

  Breadcrumb() {
    return (
      <Breadcrumb
        label="Breadcrumb"
        items={[{ label: "Settings", href: "/settings" }, { label: "Rules" }]}
      />
    );
  },

  Callout() {
    return (
      <Callout intent="warning" title="Remove the API key?">
        The bank sync stops until you add a new key.
      </Callout>
    );
  },

  ToastProvider() {
    const show = useToast();
    return (
      <Button
        onClick={() => {
          show({
            message: "Transaction deleted",
            action: { label: "Undo", onAction: restore },
          });
        }}
      >
        Delete
      </Button>
    );
  },

  Sheet() {
    return (
      <Sheet
        isOpen={isOpen}
        onClose={close}
        closeLabel="Close"
        title="Add to calendar"
      >
        <div css={stack.item}>{children}</div>
      </Sheet>
    );
  },

  Popover() {
    return (
      <Popover
        trigger={(triggerProps) => (
          <Button {...triggerProps} look="outline" size="sm">
            Details
          </Button>
        )}
      >
        <Text look="bodySmall">{children}</Text>
      </Popover>
    );
  },
} satisfies Record<string, () => ReactNode>;
