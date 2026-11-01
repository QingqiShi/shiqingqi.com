import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";

/** Shown where the app has no database. */
export function NotConfigured() {
  return (
    <main css={[pageColumn.base, styles.main]}>
      <div css={stack.tight}>
        <Heading level={1} look="h2">
          {t({
            en: "The assistant is not set up on this deployment",
            zh: "此部署尚未配置邮件助手",
          })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "This deployment has no database. Set ASSISTANT_DATABASE_URL to use it.",
            zh: "此部署没有数据库。设置 ASSISTANT_DATABASE_URL 后即可使用。",
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
