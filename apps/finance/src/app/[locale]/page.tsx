import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";

export default function Page() {
  return (
    <main css={[pageColumn.base, stack.tight, styles.main]}>
      <Heading level={1}>{t({ en: "Finance", zh: "家庭账本" })}</Heading>
      <Text as="p" tone="muted">
        {t({
          en: "Finance is moving to this address. Until then, use it on qingqi.dev.",
          zh: "家庭账本正在搬到这个地址。在此之前，请在 qingqi.dev 上使用。",
        })}
      </Text>
    </main>
  );
}

const styles = stylex.create({
  main: {
    paddingBlock: rhythm.section,
  },
});
