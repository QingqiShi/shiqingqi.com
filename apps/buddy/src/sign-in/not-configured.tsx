import { t } from "@tuja/i18n";
import { AuthFrame } from "./auth-frame.tsx";
import { AuthNotice } from "./auth-notice.tsx";

/** What an owner page shows on a server without `BUDDY_DATABASE_URL`. */
export function NotConfigured() {
  return (
    <AuthFrame>
      <AuthNotice
        heading={t({ en: "Not set up", zh: "尚未配置" })}
        text={t({
          en: "Buddy has no database on this server, so nobody can sign in.",
          zh: "此服务器上的搭子没有数据库，因此无法登录。",
        })}
      />
    </AuthFrame>
  );
}
