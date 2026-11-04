import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { AssistantFrame } from "./assistant-frame.tsx";

/** Shown where the app has no database. */
export function NotConfigured() {
  return (
    <AssistantFrame brand={t({ en: "Qi Assistant", zh: "Qi Assistant" })}>
      <div css={stack.tight}>
        <Heading level={1} look="h2">
          {t({
            en: "The assistant is not set up on this deployment",
            zh: "此部署尚未配置 Qi Assistant",
          })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "This deployment has no database. Set ASSISTANT_DATABASE_URL to use it.",
            zh: "此部署没有数据库。设置 ASSISTANT_DATABASE_URL 后即可使用。",
          })}
        </Text>
      </div>
    </AssistantFrame>
  );
}
