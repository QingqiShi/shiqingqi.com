import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TransactionsScreen } from "#src/finance/transactions/transactions-screen.tsx";

export const unstable_dynamicStaleTime = 300;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Transactions", zh: "交易" }) };
}

export default function Page() {
  return (
    <Suspense>
      <TransactionsScreen />
    </Suspense>
  );
}
