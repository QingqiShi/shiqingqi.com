"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";

/** At the end of someone else's page: the way to one's own pet, or to one of one's own. */
export function VisitorLinks({ ownName }: { ownName: string | null }) {
  const locale = useLocale();
  if (ownName !== null) {
    return (
      <div css={styles.footer}>
        <Anchor href={getLocalePath(`/u/${ownName}`, locale)}>
          {t({ en: "See your Miao", zh: "去看看你的小苗" })}
        </Anchor>
      </div>
    );
  }
  return (
    <div css={[stack.text, styles.footer]}>
      <Text as="span" look="bodySmall" tone="muted">
        {t({ en: "Want one of your own?", zh: "也想要一只？" })}
      </Text>
      <Anchor href={getLocalePath("/sign-in", locale)}>
        {t({ en: "Sign in or sign up", zh: "登录或注册" })}
      </Anchor>
    </div>
  );
}

const styles = stylex.create({
  footer: {
    alignItems: "center",
    textAlign: "center",
    paddingBlockStart: space._5,
  },
});
