import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { users } from "#src/assistant/db/schema.ts";
import { AccountSettings } from "#src/assistant/settings/account-settings.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Account", zh: "账号" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/settings/account");
  const user = await getAssistantDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, session.userId));
  return <AccountSettings email={user.at(0)?.email ?? null} />;
}
