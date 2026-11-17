import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { PageHeader } from "@tuja/ui/components/page-header";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { AssistantFrame } from "../shell/assistant-frame.tsx";

export const CONTACT_ADDRESS = "hi@qingqi.dev";

const LAST_UPDATED = "2026-11-05";

/** A public page of plain prose: the privacy policy or the terms. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AssistantFrame brand={t({ en: "Qi Assistant", zh: "Qi Assistant" })}>
      <article css={[stack.section, styles.article]}>
        <PageHeader
          title={title}
          description={`${t({ en: "Last updated", zh: "最后更新" })} ${LAST_UPDATED}`}
        />
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
