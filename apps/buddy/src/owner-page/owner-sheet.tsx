"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { LaptopIcon } from "@phosphor-icons/react/dist/ssr/Laptop";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Sheet } from "@tuja/ui/components/sheet";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { useState } from "react";
import { useCopyToClipboard } from "#src/clipboard/use-copy-to-clipboard.ts";
import { BASE_URL } from "#src/constants.ts";
import { postJson } from "#src/http/post-json.ts";
import { RouterLink } from "#src/links/router-link.tsx";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { passkeyClient } from "#src/sign-in/passkey-client.ts";

type OwnerSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  /** What sits above the list, such as the public page switch. */
  settings?: ReactNode;
  /** The rows above the way out. */
  rows?: ReactNode;
};

/**
 * The owner's own things, behind the corner button so that they never compete with the pet: what
 * the page puts in, and the way out.
 */
export function OwnerSheet({
  isOpen,
  onClose,
  settings,
  rows,
}: OwnerSheetProps) {
  const locale = useLocale();
  const [isSigningOut, setIsSigningOut] = useState(false);

  function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    passkeyClient
      .signOut()
      .catch(() => {})
      .finally(() => {
        window.location.assign(getLocalePath("/sign-in", locale));
      });
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      aria-label={t({ en: "Your Miao's settings", zh: "小苗的设置" })}
    >
      <div css={stack.item}>
        {settings}
        <List form="plain">
          {rows}
          <ListRow
            onClick={signOut}
            caret={false}
            leading={<SignOutIcon weight="bold" aria-hidden />}
            leadingSize="sm"
          >
            {t({ en: "Sign out", zh: "退出登录" })}
          </ListRow>
        </List>
      </div>
    </Sheet>
  );
}

/**
 * Whether others can see the page, saved as the owner flips it. Call it outside the sheet: the
 * sheet's content remounts on each open, and this state must survive that.
 */
export function usePageVisibility(initialPublic: boolean) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [isSaving, setIsSaving] = useState(false);
  const [didFail, setDidFail] = useState(false);

  function setVisibility(next: boolean) {
    setIsPublic(next);
    setIsSaving(true);
    setDidFail(false);
    postJson<{ public: boolean }>("/api/account/visibility", { public: next })
      .then((saved) => {
        setIsPublic(saved.public);
      })
      .catch(() => {
        setIsPublic(!next);
        setDidFail(true);
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return { isPublic, isSaving, didFail, setVisibility };
}

/** The public page switch, for the sheet's `settings`. */
export function VisibilitySwitch({
  isPublic,
  isSaving,
  didFail,
  setVisibility,
}: ReturnType<typeof usePageVisibility>) {
  return (
    <>
      <Switch
        label={t({ en: "Public page", zh: "公开页面" })}
        description={
          isPublic
            ? t({
                en: "Anyone with the link can visit Miao.",
                zh: "拿到链接的人都能来看小苗。",
              })
            : t({
                en: "Only you can see it. To everyone else it does not exist.",
                zh: "现在只有你能看到。对其他人来说，这一页并不存在。",
              })
        }
        value={isPublic ? "on" : "off"}
        disabled={isSaving}
        onChange={(state) => {
          setVisibility(state === "on");
        }}
      />
      {didFail ? (
        <Callout intent="danger" role="alert">
          {t({
            en: "That did not save. Try again.",
            zh: "未能保存，请重试。",
          })}
        </Callout>
      ) : null}
    </>
  );
}

/** The link to share and the way to the Macs, for the sheet's `rows`. */
export function ShareRows({
  name,
  connectedMacs,
}: {
  name: string;
  connectedMacs: number;
}) {
  const locale = useLocale();
  const shareUrl = `${BASE_URL}/u/${name}`;
  const { isCopied, copy } = useCopyToClipboard(shareUrl);

  return (
    <>
      <ListRow
        onClick={copy}
        caret={false}
        leading={<CopyIcon weight="bold" aria-hidden />}
        leadingSize="sm"
        detail={shareUrl.replace(/^https?:\/\//, "")}
        trailing={
          isCopied ? (
            <Text as="span" look="caption" tone="muted">
              {t({ en: "Copied", zh: "已复制" })}
            </Text>
          ) : null
        }
      >
        {t({ en: "Copy link", zh: "复制链接" })}
      </ListRow>
      <ListRow
        href={getLocalePath("/macs", locale)}
        linkComponent={RouterLink}
        leading={<LaptopIcon weight="bold" aria-hidden />}
        leadingSize="sm"
        detail={fillTemplate(t({ en: "{n} connected", zh: "{n} 台已连接" }), {
          n: connectedMacs,
        })}
      >
        {t({ en: "Your Macs", zh: "你的 Mac" })}
      </ListRow>
    </>
  );
}
