"use client";

import { AddPasskeyButton } from "@tuja/auth-ui/components/add-passkey-button";
import { EmailChangeForm } from "@tuja/auth-ui/components/email-change-form";
import { t } from "@tuja/i18n";
import { SettingsSection } from "./settings-section.tsx";

/** The signed-in account: its email, and one more passkey. */
export function AccountSettings({ email }: { email: string | null }) {
  return (
    <SettingsSection level={2} title={t({ en: "Account", zh: "账号" })}>
      <SettingsSection
        level={3}
        title={t({ en: "Email", zh: "邮箱" })}
        description={t({
          en: "The address of your account.",
          zh: "你账号的邮箱地址。",
        })}
      >
        <EmailChangeForm email={email} />
      </SettingsSection>
      <SettingsSection
        level={3}
        title={t({ en: "Passkeys", zh: "通行密钥" })}
        description={t({
          en: "Add a passkey to sign in on another device or with another password manager.",
          zh: "添加通行密钥，以便在其他设备上或用其他密码管理器登录。",
        })}
      >
        <AddPasskeyButton />
      </SettingsSection>
    </SettingsSection>
  );
}
