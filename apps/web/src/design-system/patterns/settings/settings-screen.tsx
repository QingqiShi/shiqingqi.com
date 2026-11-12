"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { CheckSquareIcon } from "@phosphor-icons/react/dist/ssr/CheckSquare";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { GoogleLogoIcon } from "@phosphor-icons/react/dist/ssr/GoogleLogo";
import { MicrosoftOutlookLogoIcon } from "@phosphor-icons/react/dist/ssr/MicrosoftOutlookLogo";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link } from "@tuja/next-links/link";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { RadioGroup } from "@tuja/ui/components/radio-group";
import { Select } from "@tuja/ui/components/select";
import { SettingList } from "@tuja/ui/components/setting-list";
import { SettingRow } from "@tuja/ui/components/setting-row";
import { Switch } from "@tuja/ui/components/switch";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import { TextField } from "@tuja/ui/components/text-field";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useState, type ReactNode } from "react";

const DELIVERY_TIMES = ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30"];

function SettingsCard({
  title,
  description,
  intent,
  children,
}: {
  title: string;
  description: string;
  intent?: "destructive";
  children: ReactNode;
}) {
  return (
    <Card intent={intent}>
      <CardHeader>
        <CardTitle level={2}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children}
    </Card>
  );
}

function RemoveButton({ address }: { address: string }) {
  return (
    <Button
      look="ghost"
      size="sm"
      icon={<TrashIcon weight="bold" />}
      aria-label={`${t({ en: "Remove ", zh: "移除 " })}${address}`}
    />
  );
}

function MailboxesCard() {
  return (
    <SettingsCard
      title={t({ en: "Mailboxes", zh: "邮箱" })}
      description={t({
        en: "The assistant reads these every 30 minutes to write your report and file your mail.",
        zh: "助理每 30 分钟读取一次这些邮箱，用来写报告和整理邮件。",
      })}
    >
      <List form="plain">
        <ListRow
          wrap
          leading={<GoogleLogoIcon weight="bold" />}
          leadingShape="square"
          detail="qingqi@example.com"
          extra={
            <MetaLine
              facts={[
                <Badge key="status" intent="success" size="sm">
                  {t({ en: "Working", zh: "正常" })}
                </Badge>,
                t({ en: "Last checked 9:30", zh: "上次检查 9:30" }),
              ]}
            />
          }
          actions={<RemoveButton address="qingqi@example.com" />}
        >
          Gmail
        </ListRow>
        <ListRow
          wrap
          leading={<MicrosoftOutlookLogoIcon weight="bold" />}
          leadingShape="square"
          detail="q.shi@example.org"
          extra={
            <Badge intent="destructive" size="sm">
              {t({ en: "Broken", zh: "已断开" })}
            </Badge>
          }
          actions={<RemoveButton address="q.shi@example.org" />}
          below={
            <Callout
              intent="destructive"
              title={t({
                en: "Sign-in expired on 7 Nov",
                zh: "登录已于11月7日过期",
              })}
              action={
                <Button
                  look="outline"
                  size="sm"
                  icon={<ArrowsClockwiseIcon weight="bold" />}
                >
                  {t({ en: "Reconnect", zh: "重新连接" })}
                </Button>
              }
            >
              {t({
                en: "The assistant cannot read this mailbox until you connect it again.",
                zh: "在你重新连接之前，助理无法读取这个邮箱。",
              })}
            </Callout>
          }
        >
          Outlook
        </ListRow>
      </List>
      <div>
        <Button look="outline" size="sm" icon={<PlusIcon weight="bold" />}>
          {t({ en: "Add mailbox", zh: "添加邮箱" })}
        </Button>
      </div>
    </SettingsCard>
  );
}

function MorningReportCard() {
  const [enabled, setEnabled] = useState(true);
  return (
    <SettingsCard
      title={t({ en: "Morning report", zh: "晨间报告" })}
      description={t({
        en: "One summary of what needs you, sent every morning.",
        zh: "每天早上发送一份摘要，列出需要你处理的事。",
      })}
    >
      <SettingList>
        <SettingRow
          label={t({ en: "Send a morning report", zh: "发送晨间报告" })}
          description={t({
            en: "Get the report by email each day.",
            zh: "每天通过邮件收到报告。",
          })}
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
          label={t({ en: "Delivery time", zh: "发送时间" })}
          description={t({
            en: "Every 30 minutes from 06:00 to 08:30.",
            zh: "06:00 到 08:30 之间，每 30 分钟一档。",
          })}
          control={
            <Select
              size="sm"
              defaultValue="07:30"
              options={DELIVERY_TIMES.map((time) => ({
                value: time,
                label: time,
              }))}
              disabled={!enabled}
            />
          }
        />
        <SettingRow
          label={t({ en: "Language", zh: "语言" })}
          control={
            <Select
              size="sm"
              defaultValue="en"
              options={[
                { value: "en", label: "English" },
                { value: "zh", label: "中文" },
              ]}
              disabled={!enabled}
            />
          }
        />
        <SettingRow
          label={t({ en: "Send a preview", zh: "发送预览" })}
          description={t({
            en: "Goes to qingqi@example.com. Changes no mail or to-dos.",
            zh: "发到 qingqi@example.com，不会改动任何邮件或待办。",
          })}
          control={
            <Button
              look="outline"
              size="sm"
              icon={<PaperPlaneTiltIcon weight="bold" />}
              disabled={!enabled}
            >
              {t({ en: "Send now", zh: "立即发送" })}
            </Button>
          }
        />
      </SettingList>
    </SettingsCard>
  );
}

function OrganiseCard() {
  const [receipts, setReceipts] = useState(true);
  return (
    <SettingsCard
      title={t({ en: "Organise the inbox", zh: "整理收件箱" })}
      description={t({
        en: "What the assistant may do with mail on its own. It never deletes or sends mail.",
        zh: "助理可以自行处理邮件的范围。它从不删除或发送邮件。",
      })}
    >
      <SettingList>
        <SettingRow
          label={t({
            en: "File receipts into a folder",
            zh: "把收据归入文件夹",
          })}
          description={t({
            en: "Receipts are moved out of the inbox.",
            zh: "收据会移出收件箱。",
          })}
          control={
            <Switch
              value={receipts ? "on" : "off"}
              onChange={(next) => {
                setReceipts(next === "on");
              }}
            />
          }
        >
          {receipts ? (
            <TextField
              label={t({ en: "Folder name", zh: "文件夹名称" })}
              size="sm"
              defaultValue="Finance/Receipts"
              spellCheck={false}
            />
          ) : null}
        </SettingRow>
        <SettingRow
          label={t({
            en: "Move promotions to Junk",
            zh: "把促销邮件移到垃圾箱",
          })}
          description={t({
            en: "Marketing mail skips the inbox.",
            zh: "营销邮件不进收件箱。",
          })}
          control={<Switch defaultValue="on" />}
        />
        <SettingRow
          label={t({
            en: "Archive newsletters after 7 days",
            zh: "7 天后归档订阅通讯",
          })}
          description={t({
            en: "Old newsletters are archived, not deleted.",
            zh: "旧的通讯会被归档，而不是删除。",
          })}
          control={<Switch defaultValue="off" />}
        />
      </SettingList>
    </SettingsCard>
  );
}

function NotificationsCard() {
  const titleId = useId();
  return (
    <Card>
      <CardHeader>
        <CardTitle level={2} id={titleId}>
          {t({ en: "Notifications", zh: "通知" })}
        </CardTitle>
        <CardDescription>
          {t({
            en: "When should the assistant notify you?",
            zh: "助理应该在什么时候通知你？",
          })}
        </CardDescription>
      </CardHeader>
      <RadioGroup
        aria-labelledby={titleId}
        name="notify"
        defaultValue="needs-me"
        options={[
          { value: "every", label: t({ en: "Every report", zh: "每份报告" }) },
          {
            value: "needs-me",
            label: t({
              en: "Only when something needs me",
              zh: "只在有事需要我时",
            }),
          },
          { value: "never", label: t({ en: "Never", zh: "从不" }) },
        ]}
      />
    </Card>
  );
}

function DangerCard() {
  return (
    <SettingsCard
      title={t({ en: "Danger zone", zh: "危险操作" })}
      description={t({
        en: "These actions cannot be undone.",
        zh: "这些操作无法撤销。",
      })}
      intent="destructive"
    >
      <SettingRow
        label={t({ en: "Delete all assistant data", zh: "删除助理的全部数据" })}
        description={t({
          en: "This removes to-dos, reports and activity. Mail is not touched.",
          zh: "会删除待办、报告和动态，不会动你的邮件。",
        })}
        control={
          <Button
            look="destructive"
            size="sm"
            icon={<TrashIcon weight="bold" />}
          >
            {t({ en: "Delete all data", zh: "删除全部数据" })}
          </Button>
        }
      />
    </SettingsCard>
  );
}

function Settings() {
  return (
    <form
      css={stack.group}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <PageHeader
        title={t({ en: "Settings", zh: "设置" })}
        description={t({
          en: "Check that your mailboxes work, and choose how the assistant behaves.",
          zh: "确认邮箱都能正常读取，并决定助理如何工作。",
        })}
      />
      <MailboxesCard />
      <MorningReportCard />
      <OrganiseCard />
      <NotificationsCard />
      <DangerCard />
      <FormFooter>
        <Button look="ghost">{t({ en: "Cancel", zh: "取消" })}</Button>
        <Button look="primary" type="submit">
          {t({ en: "Save changes", zh: "保存更改" })}
        </Button>
      </FormFooter>
    </form>
  );
}

export function SettingsScreen() {
  const locale = useLocale();
  const destinations = [
    {
      href: getLocalePath("/design-system/patterns/dashboard", locale),
      label: t({ en: "Today", zh: "今天" }),
      icon: SunIcon,
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
      current: true,
    },
  ];
  return (
    <TabView
      label={t({ en: "Mail assistant", zh: "邮件助理" })}
      items={destinations}
      linkComponent={Link}
      sidebarToggleLabel={t({ en: "Sidebar", zh: "侧边栏" })}
      header={
        <TabViewBrand
          name={t({ en: "Assistant", zh: "助理" })}
          initials="Qi"
          detail={t({ en: "2 mailboxes", zh: "2 个邮箱" })}
        />
      }
      css={pageColumn.settings}
    >
      <NavigationStack label={t({ en: "Settings", zh: "设置" })}>
        <Settings />
      </NavigationStack>
    </TabView>
  );
}
