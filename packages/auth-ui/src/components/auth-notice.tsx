"use client";

import { t } from "@tuja/i18n";
import { RouterLink } from "@tuja/next-links/router-link";
import { Anchor } from "@tuja/ui/components/anchor";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";

/** An outcome that ends a flow: what happened, and a link onward. */
export function AuthNotice({
  heading,
  text,
  href,
  linkLabel,
}: {
  heading: string;
  text: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div css={stack.tight}>
      <Heading level={1} look="h2">
        {heading}
      </Heading>
      <Text tone="muted">{text}</Text>
      {href && linkLabel ? (
        <Anchor
          href={href}
          linkComponent={RouterLink}
          newTabLabel={t({
            en: "(opens in new tab)",
            zh: "(在新标签页中打开)",
          })}
        >
          {linkLabel}
        </Anchor>
      ) : null}
    </div>
  );
}
