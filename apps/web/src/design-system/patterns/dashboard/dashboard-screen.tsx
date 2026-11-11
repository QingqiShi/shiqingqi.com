"use client";

import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { BankIcon } from "@phosphor-icons/react/dist/ssr/Bank";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CheckSquareIcon } from "@phosphor-icons/react/dist/ssr/CheckSquare";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { ImagesIcon } from "@phosphor-icons/react/dist/ssr/Images";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link } from "@tuja/next-links/link";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Columns } from "@tuja/ui/components/columns";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { StatusDot } from "@tuja/ui/components/status-dot";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState, type ReactNode } from "react";

interface Todo {
  id: string;
  title: string;
  note?: string;
  facts: ReactNode[];
  done?: boolean;
}

function PastReports() {
  const reports = [
    {
      date: "2026-11-10",
      day: t({ en: "Tue 10 Nov", zh: "11月10日 周二" }),
      current: true,
    },
    { date: "2026-11-09", day: t({ en: "Mon 9 Nov", zh: "11月9日 周一" }) },
    { date: "2026-11-08", day: t({ en: "Sun 8 Nov", zh: "11月8日 周日" }) },
    {
      date: "2026-11-07",
      day: t({ en: "Sat 7 Nov", zh: "11月7日 周六" }),
      error: true,
    },
    { date: "2026-11-06", day: t({ en: "Fri 6 Nov", zh: "11月6日 周五" }) },
  ];
  const today = t({ en: "Today", zh: "今天" });
  const mailboxError = t({ en: "Mailbox error", zh: "邮箱出错" });
  return (
    <nav aria-label={t({ en: "Reports", zh: "报告" })}>
      <NavList>
        <NavGroup label={t({ en: "Reports · November", zh: "报告 · 11月" })}>
          {reports.map((report) => (
            <NavLink
              key={report.date}
              href={`#${report.date}`}
              current={report.current}
              trailing={
                report.current ? (
                  <Badge size="sm">{today}</Badge>
                ) : report.error ? (
                  <StatusDot intent="warning" label={mailboxError} />
                ) : null
              }
            >
              {report.day}
            </NavLink>
          ))}
          <NavLink href="#reports" icon={<ListBulletsIcon weight="bold" />}>
            {t({ en: "All reports", zh: "全部报告" })}
          </NavLink>
        </NavGroup>
      </NavList>
    </nav>
  );
}

function TodoMenu({ todo }: { todo: Todo }) {
  return (
    <MenuButton
      position="topRight"
      buttonProps={{
        look: "ghost",
        size: "sm",
        icon: <DotsThreeIcon weight="bold" />,
        "aria-label": `${t({ en: "More for ", zh: "更多操作：" })}${todo.title}`,
      }}
      menuContent={
        <>
          <MenuItem>{t({ en: "Edit", zh: "编辑" })}</MenuItem>
          <MenuItem>
            {todo.done
              ? t({ en: "Reopen", zh: "重新打开" })
              : t({ en: "Move to tomorrow", zh: "移到明天" })}
          </MenuItem>
          <MenuItem intent="destructive">
            {t({ en: "Delete", zh: "删除" })}
          </MenuItem>
        </>
      }
    />
  );
}

function OpenMailButton() {
  const label = t({ en: "Open mail", zh: "打开邮件" });
  return (
    <Button
      href="#mail"
      look="outline"
      size="sm"
      icon={<EnvelopeSimpleIcon weight="bold" />}
      hideLabelOnMobile
      aria-label={label}
    >
      {label}
    </Button>
  );
}

function TodoRow({ todo }: { todo: Todo }) {
  const [done, setDone] = useState(todo.done ?? false);
  return (
    <ListRow
      wrap
      leading={
        <Checkbox
          label={todo.title}
          labelHidden
          look="done"
          checked={done}
          onChange={(event) => {
            setDone(event.target.checked);
          }}
        />
      }
      detail={todo.note}
      extra={
        todo.facts.length > 0 ? (
          <span css={cluster.tight}>{todo.facts}</span>
        ) : null
      }
      actions={
        <>
          <OpenMailButton />
          <TodoMenu todo={todo} />
        </>
      }
    >
      {done ? <Text tone="muted">{todo.title}</Text> : todo.title}
    </ListRow>
  );
}

function ReportCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle level={2}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children}
    </Card>
  );
}

function NeedsYouCard() {
  const todos: Todo[] = [
    {
      id: "council-tax",
      title: t({
        en: "Pay Camden council tax (£187.40)",
        zh: "缴纳 Camden 市政税（£187.40）",
      }),
      facts: [
        <Badge key="due" size="sm" intent="destructive">
          {t({ en: "Overdue since 9 Nov", zh: "11月9日起逾期" })}
        </Badge>,
      ],
    },
    {
      id: "passport",
      title: t({ en: "Upload new passport photo", zh: "上传新的护照照片" }),
      note: t({
        en: "Plain light-grey background, no glasses. The application number is in the mail.",
        zh: "纯浅灰背景，不戴眼镜。申请编号在邮件里。",
      }),
      facts: [
        <Badge key="due" size="sm" intent="neutral">
          {t({ en: "Due 12 Nov", zh: "11月12日截止" })}
        </Badge>,
        <Badge
          key="steps"
          size="sm"
          icon={<ListChecksIcon weight="bold" />}
          aria-label={t({
            en: "Subtasks: 0 of 3 done",
            zh: "子任务：已完成 0 项，共 3 项",
          })}
        >
          0/3
        </Badge>,
      ],
    },
    {
      id: "lumen",
      title: t({
        en: "Comment on the Lumen Q4 brand review deck",
        zh: "为 Lumen 第四季度品牌评审幻灯片写意见",
      }),
      facts: [
        <Badge key="due" size="sm" intent="warning">
          {t({ en: "Due today", zh: "今天截止" })}
        </Badge>,
      ],
    },
  ];
  return (
    <ReportCard
      title={t({ en: "Needs you", zh: "需要你处理" })}
      description={t({
        en: "Only you can do these. Most urgent first.",
        zh: "只有你能做的事，最紧急的排在前面。",
      })}
    >
      <List form="plain">
        {todos.map((todo) => (
          <TodoRow key={todo.id} todo={todo} />
        ))}
        <ListRow
          wrap
          leading={<AirplaneTiltIcon weight="bold" />}
          actions={<OpenMailButton />}
        >
          {t({
            en: "British Airways: check-in for BA0027 to Hong Kong opens Thursday 18:25. Seat 32K is held.",
            zh: "英国航空：飞往香港的 BA0027 航班周四 18:25 开放值机，32K 座位已为你保留。",
          })}
        </ListRow>
      </List>
    </ReportCard>
  );
}

function WaitingCard() {
  const todo: Todo = {
    id: "gas-check",
    title: t({
      en: "Agree a date for the gas safety check",
      zh: "约定燃气安全检查的日期",
    }),
    note: t({
      en: "You offered Thursday or Friday morning; Foxtons has not replied yet.",
      zh: "你提议了周四或周五上午，Foxtons 还没有回复。",
    }),
    facts: [
      <Badge key="who" size="sm" intent="info">
        {t({ en: "Waiting on Foxtons (Priya)", zh: "等待 Foxtons（Priya）" })}
      </Badge>,
      <Badge key="follow" size="sm" intent="neutral">
        {t({ en: "Follow up 13 Nov", zh: "11月13日跟进" })}
      </Badge>,
    ],
  };
  return (
    <ReportCard title={t({ en: "Waiting on others", zh: "等待他人" })}>
      <List form="plain">
        <TodoRow todo={todo} />
      </List>
    </ReportCard>
  );
}

function AlreadyDone() {
  return (
    <List>
      <ListRow
        wrap
        leading={<CheckCircleIcon weight="bold" />}
        detail={t({
          en: "Aviva confirmed the renewal; the new policy starts 10 Nov.",
          zh: "Aviva 已确认续保，新保单从11月10日开始生效。",
        })}
        actions={
          <Button look="ghost" size="sm">
            {t({ en: "Reopen", zh: "重新打开" })}
          </Button>
        }
      >
        <Text as="span" tone="muted">
          {t({
            en: "Already done: Renew contents insurance",
            zh: "已完成：续保家财险",
          })}
        </Text>
      </ListRow>
    </List>
  );
}

function GoodToKnowCard() {
  const notes = [
    {
      icon: <CalendarDotsIcon weight="bold" />,
      text: t({
        en: "Octopus Energy moved your boiler service from Wednesday to Thursday 12 Nov, 8:00–12:00.",
        zh: "Octopus Energy 把你的锅炉保养从周三改到了11月12日周四 8:00–12:00。",
      }),
    },
    {
      icon: <BankIcon weight="bold" />,
      text: t({
        en: "Monzo: £1,250 rent to Foxtons left your account on Saturday as scheduled.",
        zh: "Monzo：付给 Foxtons 的 £1,250 房租已于周六按计划转出。",
      }),
    },
    {
      icon: <PackageIcon weight="bold" />,
      text: t({
        en: "Your Waterstones order (2 books) was dispatched and arrives Tuesday.",
        zh: "你在 Waterstones 的订单（2 本书）已发货，周二送达。",
      }),
    },
    {
      icon: <ImagesIcon weight="bold" />,
      text: t({
        en: "Mum shared 46 photos from the Hangzhou trip in iCloud Shared Albums.",
        zh: "妈妈在 iCloud 共享相簿里分享了 46 张杭州之行的照片。",
      }),
    },
  ];
  return (
    <ReportCard
      title={t({ en: "Good to know", zh: "值得一知" })}
      description={t({ en: "No action needed.", zh: "无需处理。" })}
    >
      <List form="plain">
        {notes.map(({ icon, text }) => (
          <ListRow
            key={text}
            wrap
            leading={icon}
            leadingShape="circle"
            leadingSize="sm"
          >
            {text}
          </ListRow>
        ))}
      </List>
    </ReportCard>
  );
}

function Report() {
  return (
    <div css={stack.group}>
      <PageHeader
        eyebrow={t({
          en: "Tuesday 10 November 2026",
          zh: "2026年11月10日 星期二",
        })}
        title={t({
          en: "Your passport renewal needs a photo by Wednesday, and Octopus has moved the boiler service to Thursday morning.",
          zh: "护照续办需要在周三前交照片，Octopus 已把锅炉保养改到周四上午。",
        })}
        actions={
          <>
            <Button
              href="#reports"
              look="ghost"
              size="sm"
              icon={<ListBulletsIcon weight="bold" />}
              aria-label={t({ en: "All reports", zh: "全部报告" })}
            />
            <Button
              href="#2026-11-09"
              look="outline"
              size="sm"
              icon={<CaretLeftIcon weight="bold" />}
              aria-label={t({
                en: "Previous report: Mon 9 Nov",
                zh: "上一份报告：11月9日 周一",
              })}
            />
            <Button
              look="outline"
              size="sm"
              icon={<CaretRightIcon weight="bold" />}
              aria-label={t({ en: "Next report", zh: "下一份报告" })}
              disabled
            />
            <Button look="primary" size="sm" icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add to-do", zh: "添加待办" })}
            </Button>
          </>
        }
      />
      <StatGroup>
        <Stat
          label={t({ en: "Need you", zh: "需要你" })}
          value="4"
          detail={t({
            en: "1 overdue, 1 due today",
            zh: "1 项逾期，1 项今天截止",
          })}
        />
        <Stat
          label={t({ en: "Open to-dos", zh: "未完成待办" })}
          value="17"
          detail={t({ en: "5 for today", zh: "今天 5 项" })}
        />
        <Stat
          label={t({ en: "Mails since Monday", zh: "周一以来的邮件" })}
          value="42"
          detail={t({ en: "31 filed without you", zh: "31 封已自动归档" })}
        />
      </StatGroup>
      <Columns ratio="2:1">
        <div css={stack.group}>
          <NeedsYouCard />
          <WaitingCard />
          <AlreadyDone />
        </div>
        <div css={stack.group}>
          <GoodToKnowCard />
          <ReportCard title={t({ en: "The rest", zh: "其余邮件" })}>
            <Text as="p" look="bodySmall" tone="muted">
              {t({
                en: "31 more mails: 12 newsletters, 9 receipts filed to Finance/Receipts, 6 GitHub notifications, and 4 promotions moved to Junk.",
                zh: "另有 31 封邮件：12 封订阅通讯，9 张收据已归入 Finance/Receipts，6 条 GitHub 通知，4 封促销邮件已移到垃圾箱。",
              })}
            </Text>
          </ReportCard>
        </div>
      </Columns>
    </div>
  );
}

export function DashboardScreen() {
  const locale = useLocale();
  const destinations = [
    {
      href: getLocalePath("/design-system/patterns/dashboard", locale),
      label: t({ en: "Today", zh: "今天" }),
      icon: SunIcon,
      current: true,
    },
    {
      href: "#todos",
      label: t({ en: "To-dos", zh: "待办" }),
      icon: CheckSquareIcon,
      count: 17,
    },
    {
      href: "#activity",
      label: t({ en: "Activity", zh: "动态" }),
      icon: ClockCounterClockwiseIcon,
    },
    {
      href: getLocalePath("/design-system/patterns/settings", locale),
      label: t({ en: "Settings", zh: "设置" }),
      icon: GearSixIcon,
    },
  ];
  return (
    <TabView
      label={t({ en: "Mail assistant", zh: "邮件助理" })}
      items={destinations}
      linkComponent={Link}
      header={
        <TabViewBrand
          name={t({ en: "Assistant", zh: "助理" })}
          initials="Qi"
          detail={t({ en: "2 mailboxes", zh: "2 个邮箱" })}
        />
      }
      secondary={<PastReports />}
      css={pageColumn.report}
    >
      <NavigationSplitView
        linkComponent={Link}
        content={{ label: t({ en: "Today", zh: "今天" }), node: <Report /> }}
      />
    </TabView>
  );
}
