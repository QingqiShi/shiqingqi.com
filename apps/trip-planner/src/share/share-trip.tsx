"use client";

import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { postJson } from "@tuja/auth-ui/fetch-json";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Section } from "@tuja/ui/components/section";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { copyTextToClipboard } from "@tuja/ui/utils/copy-text-to-clipboard";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

export interface TripMemberSummary {
  userId: string;
  email: string;
  role: "owner" | "editor";
}

export interface TripInviteSummary {
  id: string;
  /** An ISO time. */
  expiresAt: string;
}

interface NewLink {
  id: string;
  url: string;
}

/** Scrolls the sheet to a message that appears after a press, where the sheet is longer than the screen. */
function Revealed({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return <div ref={ref}>{children}</div>;
}

function NewLinkCallout({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const title = t({ en: "Join my trip", zh: "加入我的行程" });
  return (
    <Callout intent="info" title={t({ en: "New link", zh: "新链接" })}>
      <div css={stack.tight}>
        <Text look="bodySmall">
          {t({
            en: "Send this link to one person now. It does not show again after you close this.",
            zh: "请现在把链接发给一个人。关闭后它不会再显示。",
          })}
        </Text>
        <TextField
          label={t({ en: "Link", zh: "链接" })}
          labelHidden
          readOnly
          value={url}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
        <div css={cluster.tight}>
          {typeof navigator.share === "function" ? (
            <Button
              size="sm"
              look="primary"
              icon={<ShareNetworkIcon weight="bold" />}
              onClick={() => {
                navigator.share({ title, url }).catch(() => {
                  // The person closed the share sheet.
                });
              }}
            >
              {t({ en: "Send", zh: "发送" })}
            </Button>
          ) : null}
          <Button
            size="sm"
            look={typeof navigator.share === "function" ? "ghost" : "primary"}
            onClick={() => {
              void copyTextToClipboard(url).then(setCopied);
            }}
          >
            {copied
              ? t({ en: "Copied", zh: "已复制" })
              : t({ en: "Copy", zh: "复制" })}
          </Button>
        </div>
      </div>
    </Callout>
  );
}

/** The owner's way to bring people onto a trip: make an invite link, send it, end it, and take a person out. */
export function ShareTrip({
  tripId,
  members,
  invites,
}: {
  tripId: string;
  members: TripMemberSummary[];
  invites: TripInviteSummary[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [newLink, setNewLink] = useState<NewLink | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [problem, setProblem] = useState<"failed" | "full" | null>(null);

  const endsOn = t({ en: "Ends on {date}", zh: "{date} 失效" });
  const endLabel = t({ en: "End link", zh: "结束链接" });
  const removeLabel = t({ en: "Remove", zh: "移除" });
  const roleLabels = {
    owner: t({ en: "Owner", zh: "所有者" }),
    editor: t({ en: "Editor", zh: "编辑者" }),
  };
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const isBusy = sending !== null || isRefreshing;

  /** Sends a change, then reads the people and the links again from the server. */
  function send(key: string, change: () => Promise<void>) {
    setSending(key);
    setProblem(null);
    change()
      .then(() => {
        startRefresh(() => {
          router.refresh();
        });
      })
      .catch((error: unknown) => {
        const isFull =
          error instanceof Error &&
          "code" in error &&
          error.code === "too_many_invites";
        setProblem(isFull ? "full" : "failed");
      })
      .finally(() => {
        setSending(null);
      });
  }

  return (
    <>
      <Button
        size="sm"
        look="outline"
        icon={<ShareNetworkIcon weight="bold" />}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {t({ en: "Share", zh: "分享" })}
      </Button>
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setNewLink(null);
          setProblem(null);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({ en: "Share this trip", zh: "分享这个行程" })}
      >
        <div css={stack.group}>
          <Text as="p" tone="muted">
            {t({
              en: "The person who opens an invite link signs in or signs up, and then joins this trip. A link works for one person, for 7 days.",
              zh: "打开邀请链接的人需要先登录或注册，然后加入这个行程。每个链接只能供一个人使用，7 天内有效。",
            })}
          </Text>
          {problem ? (
            <Revealed>
              <Callout intent="destructive" role="alert">
                {problem === "full"
                  ? t({
                      en: "This trip has as many open links as it can. End one first.",
                      zh: "这个行程的有效链接已达上限，请先结束一个。",
                    })
                  : t({
                      en: "That did not work. Try again.",
                      zh: "操作没有成功，请重试。",
                    })}
              </Callout>
            </Revealed>
          ) : null}
          <Section title={t({ en: "People", zh: "成员" })}>
            <List aria-label={t({ en: "People", zh: "成员" })}>
              {members.map((member) => (
                <ListRow
                  key={member.userId}
                  wrap
                  detail={roleLabels[member.role]}
                  actions={
                    member.role === "owner" ? undefined : (
                      <Button
                        size="sm"
                        look="ghost"
                        intent="destructive"
                        loading={sending === member.userId}
                        disabled={isBusy && sending !== member.userId}
                        onClick={() => {
                          send(member.userId, async () => {
                            await postJson("/api/members/remove", {
                              tripId,
                              userId: member.userId,
                            });
                          });
                        }}
                      >
                        {removeLabel}
                      </Button>
                    )
                  }
                >
                  {member.email}
                </ListRow>
              ))}
            </List>
          </Section>
          <Section title={t({ en: "Invite links", zh: "邀请链接" })}>
            <div css={stack.item}>
              {newLink ? (
                <Revealed key={newLink.id}>
                  <NewLinkCallout url={newLink.url} />
                </Revealed>
              ) : null}
              {invites.length > 0 ? (
                <List aria-label={t({ en: "Invite links", zh: "邀请链接" })}>
                  {invites.map((invite) => (
                    <ListRow
                      key={invite.id}
                      actions={
                        <Button
                          size="sm"
                          look="ghost"
                          intent="destructive"
                          loading={sending === invite.id}
                          disabled={isBusy && sending !== invite.id}
                          onClick={() => {
                            send(invite.id, async () => {
                              await postJson("/api/invites/end", {
                                inviteId: invite.id,
                              });
                              setNewLink((current) =>
                                current?.id === invite.id ? null : current,
                              );
                            });
                          }}
                        >
                          {endLabel}
                        </Button>
                      }
                    >
                      {endsOn.replace(
                        "{date}",
                        dateFormat.format(new Date(invite.expiresAt)),
                      )}
                    </ListRow>
                  ))}
                </List>
              ) : null}
              <div css={cluster.tight}>
                <Button
                  look={invites.length > 0 ? "outline" : "primary"}
                  loading={sending === "make"}
                  disabled={isBusy && sending !== "make"}
                  onClick={() => {
                    send("make", async () => {
                      const { invite, path } = await postJson<{
                        invite: TripInviteSummary;
                        path: string;
                      }>("/api/invites", { tripId });
                      setNewLink({
                        id: invite.id,
                        url: `${window.location.origin}${path}`,
                      });
                    });
                  }}
                >
                  {invites.length > 0
                    ? t({ en: "Make another link", zh: "再生成一个链接" })
                    : t({ en: "Make an invite link", zh: "生成邀请链接" })}
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </Sheet>
    </>
  );
}
