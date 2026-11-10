"use client";

import { EnvelopeSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimpleOpen";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { Anchor } from "#src/links/anchor.tsx";

/** Opens the mail a row came from on the app's mail page; `href` has no locale. */
export function OpenMailButton({ href }: { href: string }) {
  const locale = useLocale();
  return (
    <Button
      href={getLocalePath(href, locale)}
      size="sm"
      look="ghost"
      icon={<EnvelopeSimpleOpenIcon weight="bold" />}
      aria-label={t({ en: "Open mail", zh: "打开原邮件" })}
    />
  );
}

/** `OpenMailButton` as a link in a row's line of details, beside its dates. */
export function OpenMailLink({ href }: { href: string }) {
  const locale = useLocale();
  return (
    <Text as="span" look="caption" tone="muted">
      <Anchor
        href={getLocalePath(href, locale)}
        tone="muted"
        standalone
        css={cluster.inline}
      >
        <EnvelopeSimpleOpenIcon weight="bold" aria-hidden />
        {t({ en: "Open mail", zh: "打开原邮件" })}
      </Anchor>
    </Text>
  );
}
