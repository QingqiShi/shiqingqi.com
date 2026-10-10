import type { Metadata } from "next";
import { Suspense } from "react";
import { TransactionsScreen } from "#src/finance/transactions/transactions-screen.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

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
