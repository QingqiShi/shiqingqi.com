"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { TextField } from "@tuja/ui/components/text-field";
import { ToastProvider, useToast } from "@tuja/ui/components/toast-provider";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import { copyTextToClipboard } from "@tuja/ui/utils/copy-text-to-clipboard";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { formatTimeInZone } from "../report-page/format-day.ts";
import { useDateLocale } from "../shell/date-locale-provider.tsx";
import { keepHyphenated } from "../shell/keep-hyphenated.tsx";
import { SettingsSection } from "./settings-section.tsx";

interface CaptureTokenEntry {
  id: string;
  /** An ISO time. */
  createdAt: string;
  /** An ISO time. */
  lastUsedAt: string | null;
}

const createdToken = z.object({
  id: z.string(),
  token: z.string(),
  createdAt: z.string(),
});

function CopyField({ label, value }: { label: string; value: string }) {
  const showToast = useToast();
  const copied = t({ en: "Copied", zh: "已复制" });
  const notCopied = t({
    en: "That did not copy. Select the text and copy it yourself.",
    zh: "没有复制成功。请选中文字后自行复制。",
  });

  return (
    <div css={styles.copyLine}>
      <div css={styles.copyValue}>
        <TextField
          label={label}
          value={value}
          readOnly
          spellCheck={false}
          autoComplete="off"
          onFocus={(event) => {
            event.target.select();
          }}
        />
      </div>
      <Button
        look="outline"
        icon={<CopyIcon weight="bold" />}
        css={styles.copyButton}
        onClick={() => {
          void copyTextToClipboard(value).then((ok) => {
            showToast(
              ok
                ? { message: copied, durationMs: 4000 }
                : { message: notCopied },
            );
          });
        }}
      >
        {t({ en: "Copy", zh: "复制" })}
      </Button>
    </div>
  );
}

function TokenRow({
  entry,
  today,
  timeZone,
  onRevoke,
}: {
  entry: CaptureTokenEntry;
  today: string;
  timeZone: string;
  onRevoke: () => void;
}) {
  const locale = useDateLocale();
  const [confirming, setConfirming] = useState(false);
  const place = { today, locale, timeZone };
  const created = t({ en: "Made {time}", zh: "创建于 {time}" });
  const used = t({ en: "Last used {time}", zh: "最后使用于 {time}" });
  const notUsed = t({ en: "Not used yet", zh: "还没有使用" });
  const revokeLabel = confirming
    ? t({ en: "Revoke for good", zh: "确认撤销" })
    : t({ en: "Revoke", zh: "撤销" });

  return (
    <ListRow
      detail={
        entry.lastUsedAt
          ? used.replace("{time}", formatTimeInZone(entry.lastUsedAt, place))
          : notUsed
      }
      actions={
        <Button
          size="sm"
          look={confirming ? "destructive" : "ghost"}
          icon={<TrashIcon weight="bold" />}
          hideLabelOnMobile
          aria-label={revokeLabel}
          onClick={() => {
            if (confirming) onRevoke();
            else setConfirming(true);
          }}
        >
          {revokeLabel}
        </Button>
      }
    >
      {created.replace("{time}", formatTimeInZone(entry.createdAt, place))}
    </ListRow>
  );
}

function CaptureContent({
  tokens,
  captureUrl,
  today,
  timeZone,
}: {
  tokens: readonly CaptureTokenEntry[];
  captureUrl: string;
  today: string;
  timeZone: string;
}) {
  const showToast = useToast();
  const router = useRouter();
  const [made, setMade] = useState<readonly CaptureTokenEntry[]>([]);
  const [revoked, setRevoked] = useState<readonly string[]>([]);
  const [shown, setShown] = useState<{ id: string; token: string } | null>(
    null,
  );
  const [isMaking, setIsMaking] = useState(false);

  const copy = {
    makeFailed: t({
      en: "The token was not made. Try again.",
      zh: "没有创建令牌，请重试。",
    }),
    revokeFailed: t({
      en: "That did not save, so the token still works.",
      zh: "没有保存成功，令牌仍然有效。",
    }),
    revokedNow: t({
      en: "Revoked. A Shortcut with this token can no longer add to-dos.",
      zh: "已撤销。使用这个令牌的快捷指令不能再添加待办。",
    }),
  };

  function make() {
    setIsMaking(true);
    assistantFetch("/api/settings/capture-tokens", { method: "POST" })
      .then((response) => response.json())
      .then((body: unknown) => {
        const { id, token, createdAt } = createdToken.parse(body);
        setMade((list) => [{ id, createdAt, lastUsedAt: null }, ...list]);
        setShown({ id, token });
        router.refresh();
      })
      .catch(() => {
        showToast({ message: copy.makeFailed });
      })
      .finally(() => {
        setIsMaking(false);
      });
  }

  function revoke(id: string) {
    setRevoked((ids) => [...ids, id]);
    setShown((current) => (current?.id === id ? null : current));
    assistantFetch(`/api/settings/capture-tokens/${id}`, { method: "DELETE" })
      .then(() => {
        showToast({ message: copy.revokedNow, durationMs: 4000 });
        router.refresh();
      })
      .catch(() => {
        setRevoked((ids) => ids.filter((other) => other !== id));
        showToast({ message: copy.revokeFailed });
      });
  }

  const known = new Set(tokens.map(({ id }) => id));
  const rows = [...made.filter(({ id }) => !known.has(id)), ...tokens].filter(
    ({ id }) => !revoked.includes(id),
  );

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Add from your phone", zh: "从手机添加" })}
      description={t({
        en: "Add a to-do while you are away from this page. A date in your words, such as “by Friday”, becomes its due date.",
        zh: "不打开这个页面也能添加待办。文字里的日期（比如“周五前”）会成为截止日期。",
      })}
    >
      <div css={stack.section}>
        <SettingsSection
          level={3}
          title={t({ en: "Android", zh: "Android" })}
          description={t({
            en: "Once this app is on your home screen, it shows in the share menu of other apps.",
            zh: "把这个应用添加到主屏幕后，它会出现在其他应用的分享菜单里。",
          })}
        >
          <ol css={[stack.item, typeRole.bodySmall, styles.steps]}>
            <li>
              {t(
                {
                  en: "In Chrome, open the menu and tap <strong>Add to Home screen</strong>.",
                  zh: "在 Chrome 中打开菜单，点<strong>添加到主屏幕</strong>。",
                },
                { parse: true },
              )}
            </li>
            <li>
              {keepHyphenated(
                t(
                  {
                    en: "In another app, tap <strong>Share</strong> and choose this app. What you share opens in the box at the top of To-dos, for you to check and add.",
                    zh: "在其他应用里点<strong>分享</strong>，选择这个应用。分享的内容会填进“待办”顶部的输入框，由你确认后添加。",
                  },
                  { parse: true },
                ),
              )}
            </li>
          </ol>
        </SettingsSection>
        <SettingsSection
          level={3}
          title={t({ en: "iPhone and iPad", zh: "iPhone 和 iPad" })}
          description={t({
            en: "iOS does not let a web app take shares, so a Shortcut adds the to-do. You can run it with Siri. A token lets the Shortcut add to-dos and do nothing else.",
            zh: "iOS 不允许网页应用接收分享，所以用快捷指令来添加待办，也可以用 Siri 运行。令牌只能让快捷指令添加待办，不能做别的事。",
          })}
        >
          <ol css={[stack.item, typeRole.bodySmall, styles.steps]}>
            <li>
              {t(
                {
                  en: "In the Shortcuts app, make a new shortcut. Its name is what you say to Siri, such as <strong>Add to-do</strong>.",
                  zh: "在“快捷指令”应用里新建一个快捷指令。它的名称就是你对 Siri 说的话，比如<strong>添加待办</strong>。",
                },
                { parse: true },
              )}
            </li>
            <li>
              {t(
                {
                  en: "Add the action <strong>Ask for Input</strong>, with the type <strong>Text</strong>.",
                  zh: "添加操作<strong>要求输入</strong>，类型选<strong>文本</strong>。",
                },
                { parse: true },
              )}
            </li>
            <li>
              <div css={stack.tight}>
                <div>
                  {t(
                    {
                      en: "Add the action <strong>Get Contents of URL</strong> with this URL. Open its details and set <strong>Method</strong> to <strong>POST</strong>.",
                      zh: "添加操作<strong>获取 URL 内容</strong>，填入这个 URL。展开详情，把<strong>方法</strong>设为 <strong>POST</strong>。",
                    },
                    { parse: true },
                  )}
                </div>
                <CopyField label="URL" value={captureUrl} />
              </div>
            </li>
            <li>
              <div css={stack.tight}>
                <div>
                  {t(
                    {
                      en: "Under <strong>Headers</strong>, add <strong>Authorization</strong>. Make a token and paste its value.",
                      zh: "在<strong>头部</strong>下添加 <strong>Authorization</strong>。新建一个令牌，粘贴它的值。",
                    },
                    { parse: true },
                  )}
                </div>
                {shown ? (
                  <Callout
                    title={t({
                      en: "Copy this token now. It shows only this once.",
                      zh: "现在就复制这个令牌，它只显示这一次。",
                    })}
                  >
                    <CopyField
                      label={t({
                        en: "Authorization value",
                        zh: "Authorization 的值",
                      })}
                      value={`Bearer ${shown.token}`}
                    />
                  </Callout>
                ) : null}
                <div>
                  <Button
                    look="outline"
                    icon={<PlusIcon weight="bold" />}
                    loading={isMaking}
                    onClick={make}
                  >
                    {t({ en: "New token", zh: "新建令牌" })}
                  </Button>
                </div>
              </div>
            </li>
            <li>
              {t(
                {
                  en: "Under <strong>Request Body</strong>, choose <strong>JSON</strong>. Add a field of type <strong>Text</strong> with the key <strong>text</strong>, and choose <strong>Provided Input</strong> as its value.",
                  zh: "在<strong>请求正文</strong>下选择 <strong>JSON</strong>。添加一个<strong>文本</strong>类型的字段，键为 <strong>text</strong>，值选<strong>提供的输入</strong>。",
                },
                { parse: true },
              )}
            </li>
            <li>
              {keepHyphenated(
                t(
                  {
                    en: "Add the action <strong>Show Result</strong> and choose <strong>Contents of URL</strong>, so that you see the new to-do, or the error when it fails.",
                    zh: "添加操作<strong>显示结果</strong>，选择 <strong>URL 的内容</strong>，这样你能看到新待办，或失败时的错误。",
                  },
                  { parse: true },
                ),
              )}
            </li>
          </ol>
        </SettingsSection>
        {rows.length > 0 ? (
          <SettingsSection
            level={3}
            title={t({ en: "Your tokens", zh: "你的令牌" })}
            description={t({
              en: "A Shortcut with a token can add to-dos until you revoke it.",
              zh: "在你撤销令牌之前，使用它的快捷指令都能添加待办。",
            })}
          >
            <List>
              {rows.map((entry) => (
                <TokenRow
                  key={entry.id}
                  entry={entry}
                  today={today}
                  timeZone={timeZone}
                  onRevoke={() => {
                    revoke(entry.id);
                  }}
                />
              ))}
            </List>
          </SettingsSection>
        ) : null}
      </div>
    </SettingsSection>
  );
}

/** How to add a to-do from a phone, and the tokens that a Shortcut uses for it. */
export function CaptureSettings(props: {
  tokens: readonly CaptureTokenEntry[];
  captureUrl: string;
  today: string;
  timeZone: string;
}) {
  return (
    <ToastProvider
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
      css={styles.toasts}
    >
      <CaptureContent {...props} />
    </ToastProvider>
  );
}

const styles = stylex.create({
  copyLine: {
    display: "flex",
    alignItems: "flex-end",
    gap: rhythm.tight,
  },
  copyValue: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  copyButton: {
    flexShrink: 0,
  },
  steps: {
    listStyleType: "decimal",
    paddingInlineStart: space._5,
    marginBlock: 0,
    maxInlineSize: measure.prose,
  },
  toasts: {
    [toastTokens.clearance]: tabViewTokens.barClearance,
  },
});
