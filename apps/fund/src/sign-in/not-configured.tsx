import { AuthNotice } from "@tuja/auth-ui/components/auth-notice";
import { t } from "@tuja/i18n";
import { AuthFrame } from "./auth-frame.tsx";

/** What a sign-in page shows on a server without `FUND_AUTH_SECRET`. */
export function NotConfigured() {
  return (
    <AuthFrame>
      <AuthNotice
        heading={t({ en: "Not set up", zh: "尚未配置" })}
        text={t({
          en: "Sign-in is not set up on this server yet.",
          zh: "此服务器尚未配置登录。",
        })}
      />
    </AuthFrame>
  );
}
