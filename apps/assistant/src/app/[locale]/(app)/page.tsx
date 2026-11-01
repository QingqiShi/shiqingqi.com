import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Digest", zh: "摘要" }) };
}

export default function Page() {
  return (
    <div css={stack.tight}>
      <Heading level={1} look="h1">
        {t({ en: "Nothing to read yet", zh: "暂时没有需要看的" })}
      </Heading>
      <Text tone="muted">
        {t({
          en: "Your morning digest shows on this page once you connect a mailbox.",
          zh: "连接邮箱后，每天早上的摘要会显示在这里。",
        })}
      </Text>
    </div>
  );
}
