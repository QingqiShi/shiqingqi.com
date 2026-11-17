"use client";

import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { RouterLink } from "@tuja/next-links/router-link";
import { Anchor } from "@tuja/ui/components/anchor";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { toApiError, type ApiError } from "../api-error.ts";
import { passkeyClient } from "../passkey-client.ts";
import { useAuthErrorMessage } from "../use-auth-error-message.ts";

interface SignUpPanelProps {
  token: string;
  /** The confirmed address, which recovers the user if the passkeys are lost. */
  email: string;
  /** Where to go after the sign-up, without a locale. */
  next: string;
  /**
   * The app's page of terms and privacy, with the locale. With it, the panel
   * says that a sign-up agrees to them. An app with no such page leaves it out.
   */
  termsHref?: string;
}

function TermsNote({ href }: { href: string }) {
  return (
    <Text look="caption" tone="muted">
      {t({ en: "By signing up, you agree to the ", zh: "注册即表示你同意" })}
      <Anchor
        href={href}
        tone="muted"
        linkComponent={RouterLink}
        newTabLabel={t({ en: "(opens in new tab)", zh: "(在新标签页中打开)" })}
      >
        {t({ en: "terms and privacy policy", zh: "服务条款和隐私政策" })}
      </Anchor>
      {t({ en: ".", zh: "。" })}
    </Text>
  );
}

/** Creates the user for the confirmed address and saves a passkey on this device. */
export function SignUpPanel({
  token,
  email,
  next,
  termsHref,
}: SignUpPanelProps) {
  const locale = useLocale();
  const messageOf = useAuthErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Sign up", zh: "注册" })}
        </Heading>
        <Text tone="muted">
          {`${t({ en: "Email confirmed: ", zh: "邮箱已确认：" })}${email}${t({
            en: ". Save a passkey on this device to finish.",
            zh: "。在本设备上保存通行密钥即可完成注册。",
          })}`}
        </Text>
      </div>
      {error === null ? null : (
        <Callout intent="destructive" role="alert">
          {messageOf(error)}
        </Callout>
      )}
      <Button
        look="primary"
        size="lg"
        icon={<FingerprintIcon weight="bold" />}
        loading={busy}
        css={fill.inline}
        onClick={() => {
          setBusy(true);
          setError(null);
          passkeyClient
            .signUp(token)
            .then(() => {
              window.location.assign(getLocalePath(next, locale));
            })
            .catch((caught: unknown) => {
              const apiError = toApiError(caught);
              if (apiError.code !== "cancelled") setError(apiError);
              setBusy(false);
            });
        }}
      >
        {t({ en: "Save a passkey", zh: "保存通行密钥" })}
      </Button>
      {termsHref ? <TermsNote href={termsHref} /> : null}
    </div>
  );
}
