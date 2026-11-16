import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  getFinancePageSession,
  getNewUserPageSession,
} from "#src/finance/auth/get-finance-page-session.ts";
import { WELCOME_PATH } from "#src/finance/auth/require-finance-page-session.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { FinanceNotConfigured } from "#src/finance/shell/finance-not-configured.tsx";
import { FinanceAuthFrame } from "#src/finance/sign-in/finance-auth-frame.tsx";
import { SetUpPanel } from "#src/finance/sign-in/set-up-panel.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Welcome to Finance", zh: "欢迎使用家庭账本" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await connection();
  if (!isFinanceConfigured()) return <FinanceNotConfigured />;
  if (!(await getNewUserPageSession())) {
    redirect(
      (await getFinancePageSession())
        ? getLocalePath("/", locale)
        : signInPath(locale, WELCOME_PATH),
    );
  }

  return (
    <FinanceAuthFrame>
      <SetUpPanel />
    </FinanceAuthFrame>
  );
}
