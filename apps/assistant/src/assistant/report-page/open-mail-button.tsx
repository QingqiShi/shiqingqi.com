"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";

/** Opens the mail a row came from, in the owner's mail app or its web page. */
export function OpenMailButton({ href }: { href: string }) {
  return (
    <AnchorButton
      href={href}
      size="sm"
      look="ghost"
      icon={<ArrowSquareOutIcon weight="bold" />}
      aria-label={t({ en: "Open mail", zh: "打开原邮件" })}
      {...(href.startsWith("https:")
        ? { target: "_blank", rel: "noreferrer" }
        : {})}
    />
  );
}
