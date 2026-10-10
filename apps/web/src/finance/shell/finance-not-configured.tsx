import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

/** Shown where Finance has no database, such as a preview deployment. */
export function FinanceNotConfigured() {
  return (
    <main css={[pageColumn.base, styles.main]}>
      <div css={stack.tight}>
        <Heading level={1} look="h2">
          {t({
            en: "Finance is not set up on this deployment",
            zh: "此部署尚未配置家庭账本",
          })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "This deployment has no finance database. Set FINANCE_DATABASE_URL to use it.",
            zh: "此部署没有家庭账本数据库。设置 FINANCE_DATABASE_URL 后即可使用。",
          })}
        </Text>
      </div>
    </main>
  );
}

const styles = stylex.create({
  main: {
    paddingBlock: space._10,
  },
});
