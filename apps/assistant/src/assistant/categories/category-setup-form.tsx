"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Section } from "@tuja/ui/components/section";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROVIDER_NAMES } from "#src/assistant/mailboxes/provider-names.ts";
import { toAssistantApiError } from "../http/assistant-api-error.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";
import type { CategorySetupAccount } from "../mail/categories/list-category-setup.ts";

interface Choice {
  enabled: boolean;
  name: string;
}

function lastSegment(path: string) {
  return path.split(/[/.]/).at(-1) ?? path;
}

/**
 * Every folder of every account, with its counts. The user marks the
 * folders that are categories and names them; folders with the same name
 * in different accounts become one category.
 */
export function CategorySetupForm({
  accounts,
}: {
  accounts: CategorySetupAccount[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const numbers = new Intl.NumberFormat(locale);
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(
      accounts.flatMap((account) =>
        account.folders.map((folder) => [
          folder.id,
          {
            enabled: folder.category !== null,
            name: folder.category ?? lastSegment(folder.path),
          },
        ]),
      ),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<
    | { kind: "saved" }
    | { kind: "error"; code: string; detail: string | null }
    | null
  >(null);
  const duplicateText = t({
    en: "One mailbox can file a category into one folder only. Two folders of one mailbox are named “{name}”.",
    zh: "同一个邮箱里，一个分类只能对应一个文件夹。有两个文件夹都叫“{name}”。",
  });
  const failedText = t({
    en: "The categories were not saved. Try again.",
    zh: "分类没有保存成功，请重试。",
  });
  const mailCount = t({ en: "{count} mails", zh: "{count} 封" });
  const labels = {
    noFolders: t({
      en: "No folders yet. They show up after the first sync.",
      zh: "还没有文件夹，首次同步后会显示在这里。",
    }),
    useAsCategory: t({ en: "Use as a category", zh: "作为分类" }),
    systemFolder: t({ en: "System folder", zh: "系统文件夹" }),
    categoryName: t({ en: "Category name", zh: "分类名称" }),
  };
  const unreadCount = t({ en: "{count} unread", zh: "{count} 封未读" });

  function update(folderId: string, change: Partial<Choice>) {
    setChoices((current) => ({
      ...current,
      [folderId]: { ...current[folderId], ...change },
    }));
    setNotice(null);
  }

  return (
    <form
      css={stack.section}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        const folders = accounts.flatMap((account) =>
          account.folders
            .filter((folder) => folder.canBeCategory)
            .map((folder) => {
              const choice = choices[folder.id];
              return {
                folderId: folder.id,
                category: choice.enabled ? choice.name : null,
              };
            }),
        );
        assistantFetch("/api/categories", {
          method: "PUT",
          body: JSON.stringify({ folders }),
        })
          .then(() => {
            setNotice({ kind: "saved" });
            router.refresh();
          })
          .catch((caught: unknown) => {
            const error = toAssistantApiError(caught);
            const data = error.body;
            setNotice({
              kind: "error",
              code: error.code,
              detail:
                typeof data === "object" &&
                data !== null &&
                "detail" in data &&
                typeof data.detail === "string"
                  ? data.detail
                  : null,
            });
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      {accounts.map((account) => (
        <Section
          key={account.id}
          title={account.address}
          description={PROVIDER_NAMES[account.provider]}
        >
          {account.folders.length === 0 ? (
            <Text as="p" tone="muted">
              {labels.noFolders}
            </Text>
          ) : (
            <ul css={styles.list}>
              {account.folders.map((folder) => {
                const choice = choices[folder.id];
                return (
                  <li key={folder.id} css={styles.row}>
                    <div css={styles.head}>
                      <div css={stack.text}>
                        <Text weight="medium">{folder.path}</Text>
                        <Text look="bodySmall" tone="muted">
                          {mailCount.replace(
                            "{count}",
                            numbers.format(folder.messageCount ?? 0),
                          )}
                          {folder.unseenCount
                            ? ` · ${unreadCount.replace("{count}", numbers.format(folder.unseenCount))}`
                            : null}
                        </Text>
                      </div>
                      {folder.canBeCategory ? (
                        <Switch
                          size="sm"
                          aria-label={labels.useAsCategory}
                          value={choice.enabled ? "on" : "off"}
                          onChange={(state) => {
                            update(folder.id, { enabled: state === "on" });
                          }}
                        />
                      ) : (
                        <Text look="caption" tone="muted">
                          {labels.systemFolder}
                        </Text>
                      )}
                    </div>
                    {folder.canBeCategory && choice.enabled ? (
                      <TextField
                        size="sm"
                        label={labels.categoryName}
                        required
                        maxLength={60}
                        value={choice.name}
                        onChange={(event) => {
                          update(folder.id, { name: event.target.value });
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      ))}
      {notice?.kind === "saved" ? (
        <Callout intent="success" role="status">
          {t({ en: "Categories saved.", zh: "分类已保存。" })}
        </Callout>
      ) : null}
      {notice?.kind === "error" ? (
        <Callout intent="danger" role="alert">
          {notice.code === "duplicate-category"
            ? duplicateText.replace("{name}", notice.detail ?? "")
            : failedText}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" look="primary" loading={busy} disabled={busy}>
          {t({ en: "Save categories", zh: "保存分类" })}
        </Button>
      </div>
    </form>
  );
}

const styles = stylex.create({
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlock: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
  },
});
