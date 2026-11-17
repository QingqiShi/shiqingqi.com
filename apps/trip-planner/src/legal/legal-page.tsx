import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";

/** The terms or the privacy page: a title, the date of the text, and short sections, with a way back home. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** When the text last changed, as a sentence. */
  updated: string;
  children: ReactNode;
}) {
  return (
    <NavigationStack
      label={title}
      back={{
        href: getLocalePath("/", getLocale()),
        label: t({ en: "Trips", zh: "旅行计划" }),
      }}
    >
      <article css={[stack.section, styles.article]}>
        <header css={stack.tight}>
          <Heading level={1} look="h1">
            {title}
          </Heading>
          <Text tone="muted">{updated}</Text>
        </header>
        {children}
      </article>
    </NavigationStack>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section css={stack.item}>
      <Heading level={2} look="h3">
        {title}
      </Heading>
      {children}
    </section>
  );
}

const styles = stylex.create({
  article: {
    maxInlineSize: "40rem",
  },
});
