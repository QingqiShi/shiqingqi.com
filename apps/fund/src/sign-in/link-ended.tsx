import { AuthNotice } from "@tuja/auth-ui/components/auth-notice";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";

/** What a sign-up or recovery link shows when it has expired or was used. */
export function LinkEnded() {
  return (
    <AuthNotice
      heading={t({ en: "This link has ended", zh: "此链接已失效" })}
      text={t({
        en: "It has expired or was used already. Ask for a new code on the sign-in page.",
        zh: "链接已过期或已被使用。请在登录页重新获取验证码。",
      })}
      href={getLocalePath("/sign-in", getLocale())}
      linkLabel={t({ en: "Go to sign-in", zh: "前往登录" })}
    />
  );
}
