import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { AssistantFrame } from "../shell/assistant-frame.tsx";

// TODO(owner): put the contact address here before the Google and Microsoft
// apps go to review.
export const CONTACT_ADDRESS = "[TODO: contact address]";

export const LAST_UPDATED = "2026-11-01";

/** A public page of plain prose: the privacy policy or the terms. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AssistantFrame brand={t({ en: "Mail Assistant", zh: "邮件助手" })}>
      <article css={[stack.section, styles.article]}>
        <div css={stack.tight}>
          <Heading level={1} look="h1">
            {title}
          </Heading>
          <Text tone="muted" look="bodySmall">
            {`${t({ en: "Last updated", zh: "最后更新" })} ${LAST_UPDATED}`}
          </Text>
        </div>
        {children}
      </article>
    </AssistantFrame>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section css={stack.tight}>
      <Heading level={2} look="h3">
        {heading}
      </Heading>
      {children}
    </section>
  );
}

const styles = stylex.create({
  article: {
    paddingBlockEnd: space._10,
  },
});
