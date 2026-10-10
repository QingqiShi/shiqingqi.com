"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useRef, useState } from "react";
import { copyTextToClipboard } from "#src/browser/copy-text-to-clipboard.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { isRowPending } from "../store/is-row-pending.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { MemberRow } from "../sync/row-schemas.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { householdApiClient } from "./household-api-client.ts";
import { RemoveMemberSheet } from "./remove-member-sheet.tsx";
import { SettingsList } from "./settings-list.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { SettingsRow } from "./settings-row.tsx";
import { useApplyMutations } from "./use-apply-mutations.ts";
import { useIsOwner } from "./use-is-owner.ts";

interface Invite {
  memberId: string;
  url: string;
  expiresAt: string;
  recovery: boolean;
}

interface Editing {
  /** Null while adding a new Member. */
  member: MemberRow | null;
}

/** The Household's Members: add, rename, invite one to sign in, remove one, and add a passkey for yourself. */
export function MembersSettings() {
  const locale = useLocale();
  const { memberId, runtime } = useFinanceRuntime();
  const isOwner = useIsOwner();
  const members = useReplica(liveRowSelectors.members);
  const apply = useApplyMutations();
  const showToast = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const messages = {
    copied: t({ en: "Invite link copied", zh: "邀请链接已复制" }),
    inviteFailed: t({
      en: "The invite link could not be made. Try again when you are online.",
      zh: "未能生成邀请链接，请联网后重试。",
    }),
    passkeyAdded: t({
      en: "Passkey added to this device",
      zh: "已在此设备添加通行密钥",
    }),
    passkeyFailed: t({
      en: "The passkey was not added",
      zh: "未能添加通行密钥",
    }),
    nameMissing: t({ en: "Enter a name", zh: "请填写名称" }),
    added: t({ en: "Member added", zh: "成员已添加" }),
    renamed: t({ en: "Member renamed", zh: "成员已重命名" }),
    removed: t({ en: "Member removed", zh: "成员已移除" }),
    removeFailed: t({
      en: "The member was not removed. Try again when you are online.",
      zh: "未能移除成员，请联网后重试。",
    }),
    restored: t({
      en: "Member restored. Send them a new invite link to sign in again.",
      zh: "成员已恢复。发送新的邀请链接后，对方才能再次登录。",
    }),
    restoreFailed: t({
      en: "Couldn't undo. Try again when you are online.",
      zh: "无法撤销，请联网后重试。",
    }),
    undo: t({ en: "Undo", zh: "撤销" }),
    shareTitle: t({
      en: "Join our household in Finance",
      zh: "加入我们的家庭账本",
    }),
  };

  const labels = {
    notSignedIn: t({ en: "Not signed in yet", zh: "尚未登录" }),
    owner: t({
      en: "Owner · signs in with a passkey",
      zh: "所有者 · 使用通行密钥登录",
    }),
    signsIn: t({ en: "Signs in with a passkey", zh: "使用通行密钥登录" }),
    you: t({ en: "You", zh: "你" }),
    createInvite: t({ en: "Create invite link", zh: "生成邀请链接" }),
    recoveryLink: t({ en: "Recovery link", zh: "恢复链接" }),
  };

  async function createInvite(member: MemberRow) {
    setBusy(`invite:${member.id}`);
    try {
      if (isRowPending(runtime.store.getSnapshot(), "members", member.id)) {
        await runtime.loop.sync();
      }
      const result = await financePasskeyClient.createInvite(member.id);
      const url = `${window.location.origin}${getLocalePath(result.path, locale)}`;
      setInvite({
        memberId: member.id,
        url,
        expiresAt: result.expiresAt,
        recovery: result.recovery,
      });
    } catch {
      showToast({ message: messages.inviteFailed });
    } finally {
      setBusy(null);
    }
  }

  const removable =
    isOwner && editing?.member && editing.member.id !== memberId
      ? editing.member
      : null;

  async function restoreMember(member: MemberRow) {
    try {
      await householdApiClient.setMemberRemoved(member.id, false);
      await runtime.loop.sync();
      showToast({ message: messages.restored, durationMs: 6000 });
    } catch {
      showToast({ message: messages.restoreFailed });
    }
  }

  async function removeMember(member: MemberRow) {
    setBusy(`remove:${member.id}`);
    try {
      if (isRowPending(runtime.store.getSnapshot(), "members", member.id)) {
        await runtime.loop.sync();
      }
      await householdApiClient.setMemberRemoved(member.id, true);
      await runtime.loop.sync();
      setRemoving(null);
      if (invite?.memberId === member.id) setInvite(null);
      showToast({
        message: messages.removed,
        action: {
          label: messages.undo,
          onAction: () => void restoreMember(member),
        },
      });
    } catch {
      showToast({ message: messages.removeFailed });
    } finally {
      setBusy(null);
    }
  }

  async function addPasskey() {
    setBusy("passkey");
    try {
      await financePasskeyClient.addPasskey();
      showToast({ message: messages.passkeyAdded, durationMs: 4000 });
    } catch (error) {
      if (!(error instanceof FinanceApiError && error.code === "cancelled")) {
        showToast({ message: messages.passkeyFailed });
      }
    } finally {
      setBusy(null);
    }
  }

  async function share(url: string) {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: messages.shareTitle, url });
        return;
      } catch {
        // The person closed the share sheet; copying is the fallback.
      }
    }
    if (await copyTextToClipboard(url))
      showToast({ message: messages.copied, durationMs: 4000 });
  }

  return (
    <SettingsPanel
      title={t({ en: "Members", zh: "成员" })}
      description={t({
        en: "Each person who spends from the household. A member signs in with their own passkey after an invite.",
        zh: "家庭中每位有收支的人。成员收到邀请后用自己的通行密钥登录。",
      })}
      actions={
        <>
          <Button
            size="sm"
            icon={<PlusIcon weight="bold" />}
            onClick={() => {
              setEditing({ member: null });
              setName("");
              setNameError(undefined);
            }}
          >
            {t({ en: "Member", zh: "成员" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            loading={busy === "passkey"}
            onClick={() => void addPasskey()}
          >
            {t({
              en: "Add a passkey on this device",
              zh: "在此设备添加通行密钥",
            })}
          </Button>
        </>
      }
    >
      <SettingsList>
        {members.map((member) => (
          <SettingsRow
            key={member.id}
            title={member.name}
            detail={
              member.userId === null
                ? labels.notSignedIn
                : member.role === "owner"
                  ? labels.owner
                  : labels.signsIn
            }
            trailing={
              member.id === memberId ? (
                <Badge size="sm" intent="neutral">
                  {labels.you}
                </Badge>
              ) : null
            }
            onClick={() => {
              setEditing({ member });
              setName(member.name);
              setNameError(undefined);
            }}
          />
        ))}
      </SettingsList>
      {members
        .filter(
          (member) =>
            member.userId === null || (isOwner && member.id !== memberId),
        )
        .map((member) => (
          <div key={member.id} css={stack.tight}>
            <div css={cluster.tight}>
              <Text look="bodySmall">{member.name}</Text>
              <Button
                size="sm"
                look="outline"
                loading={busy === `invite:${member.id}`}
                aria-label={`${member.userId === null ? labels.createInvite : labels.recoveryLink}: ${member.name}`}
                onClick={() => void createInvite(member)}
              >
                {member.userId === null
                  ? labels.createInvite
                  : labels.recoveryLink}
              </Button>
            </div>
            {invite?.memberId === member.id ? (
              <InviteLink
                invite={invite}
                memberName={member.name}
                onShare={() => void share(invite.url)}
                onCopy={() => {
                  void copyTextToClipboard(invite.url).then((ok) => {
                    if (ok)
                      showToast({ message: messages.copied, durationMs: 4000 });
                  });
                }}
              />
            ) : null}
          </div>
        ))}
      <EditSheet
        isOpen={editing !== null}
        onClose={() => {
          setEditing(null);
        }}
        title={
          editing?.member === null
            ? t({ en: "Add member", zh: "添加成员" })
            : t({ en: "Rename member", zh: "重命名成员" })
        }
        initialFocusRef={nameRef}
        danger={
          removable
            ? {
                label: t({ en: "Remove", zh: "移除" }),
                onAction: () => {
                  setRemoving(removable);
                },
              }
            : undefined
        }
        onSave={() => {
          if (editing === null) return false;
          if (name.trim() === "") {
            setNameError(messages.nameMissing);
            return false;
          }
          return apply(
            [
              {
                name: "upsertMember",
                args: {
                  id: editing.member?.id ?? crypto.randomUUID(),
                  name: name.trim(),
                },
              },
            ],
            {
              message:
                editing.member === null ? messages.added : messages.renamed,
            },
          );
        }}
      >
        <TextField
          ref={nameRef}
          label={t({ en: "Name", zh: "名称" })}
          description={
            editing?.member === null
              ? t({
                  en: "They can sign in after you send them an invite link.",
                  zh: "发送邀请链接后，对方即可登录。",
                })
              : undefined
          }
          value={name}
          error={nameError}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
        />
      </EditSheet>
      <RemoveMemberSheet
        member={removing}
        busy={removing !== null && busy === `remove:${removing.id}`}
        onConfirm={(member) => void removeMember(member)}
        onClose={() => {
          setRemoving(null);
        }}
      />
    </SettingsPanel>
  );
}

interface InviteLinkProps {
  invite: Invite;
  memberName: string;
  onShare: () => void;
  onCopy: () => void;
}

function InviteLink({ invite, memberName, onShare, onCopy }: InviteLinkProps) {
  const locale = useLocale();
  return (
    <Callout
      intent={invite.recovery ? "warning" : "info"}
      title={
        invite.recovery
          ? t({ en: "Recovery link", zh: "恢复链接" })
          : t({ en: "Invite link", zh: "邀请链接" })
      }
    >
      <div css={stack.tight}>
        {invite.recovery ? (
          <Text look="bodySmall">
            {`${t({
              en: "Only for a member who lost every passkey. Signing in with it replaces the old passkeys of ",
              zh: "仅用于丢失全部通行密钥的成员。用它登录会替换",
            })}${memberName}${t({ en: ".", zh: "的旧通行密钥。" })}`}
          </Text>
        ) : null}
        <Text look="bodySmall">
          {`${t({ en: "Send this link to ", zh: "把链接发给" })}${memberName}${t(
            {
              en: ". It works once, until ",
              zh: "。仅可使用一次，有效期至",
            },
          )}${displayDay(invite.expiresAt.slice(0, 10), locale, "dayYear")}${t({
            en: ".",
            zh: "。",
          })}`}
        </Text>
        <TextField
          label={t({ en: "Link", zh: "链接" })}
          labelHidden
          readOnly
          value={invite.url}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
        <div css={cluster.tight}>
          <Button
            size="sm"
            look="primary"
            icon={<ShareNetworkIcon weight="bold" />}
            onClick={onShare}
          >
            {t({ en: "Share", zh: "分享" })}
          </Button>
          <Button size="sm" look="ghost" onClick={onCopy}>
            {t({ en: "Copy", zh: "复制" })}
          </Button>
        </div>
      </div>
    </Callout>
  );
}
