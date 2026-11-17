import { AddPasskeyButton } from "@tuja/auth-ui/components/add-passkey-button";
import { EmailChangeForm } from "@tuja/auth-ui/components/email-change-form";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Section } from "@tuja/ui/components/section";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ownAccountName } from "#src/server/account/own-account.ts";
import { accountEmail } from "#src/server/auth/account-email.ts";
import { requirePageSession } from "#src/server/auth/require-page-session.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";
import { OwnerFooter } from "#src/sign-in/owner-footer.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Account", zh: "账号" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await connection();
  const db = getBuddyDb();
  if (!db) return <NotConfigured />;
  const { userId } = await requirePageSession(locale, "/account");
  const [name, email] = await Promise.all([
    ownAccountName(db, userId),
    accountEmail(db, userId),
  ]);

  return (
    <AuthFrame>
      <Heading level={1} look="h1">
        {t({ en: "Account", zh: "账号" })}
      </Heading>
      <Section
        level={2}
        look="heading"
        title={t({ en: "Email", zh: "邮箱" })}
        description={t({
          en: "The address of your account.",
          zh: "你账号的邮箱地址。",
        })}
      >
        <EmailChangeForm email={email} />
      </Section>
      <Section
        level={2}
        look="heading"
        title={t({ en: "Passkeys", zh: "通行密钥" })}
        description={t({
          en: "Add a passkey to sign in on another device or with another password manager.",
          zh: "添加通行密钥，以便在其他设备上或用其他密码管理器登录。",
        })}
      >
        <AddPasskeyButton />
      </Section>
      <OwnerFooter
        links={[
          ...(name
            ? [
                {
                  href: getLocalePath(`/u/${name}`, locale),
                  label: t({ en: "See your pet", zh: "去看看你的宠物" }),
                },
              ]
            : []),
          {
            href: getLocalePath("/macs", locale),
            label: t({ en: "Your Macs", zh: "你的 Mac" }),
          },
        ]}
      />
    </AuthFrame>
  );
}
