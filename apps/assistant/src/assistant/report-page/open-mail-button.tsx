"use client";

import { EnvelopeSimpleOpenIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimpleOpen";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";

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
