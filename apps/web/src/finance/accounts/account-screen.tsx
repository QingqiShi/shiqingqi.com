"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { AccountDetail } from "./account-detail.tsx";

/** `/finance/accounts/[id]`: one account on its own page, with the way back to Net worth. */
export function AccountScreen({ accountId }: { accountId: string }) {
  const locale = useLocale();
  const router = useRouter();
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  return (
    <div css={stack.item}>
      <div>
        <AnchorButton
          href={getLocalePath("/finance", locale)}
          linkComponent={Link}
          look="ghost"
          size="sm"
          icon={<ArrowLeftIcon weight="bold" />}
        >
          {t({ en: "Net worth", zh: "净资产" })}
        </AnchorButton>
      </div>
      {bootstrapped ? (
        <AccountDetail
          accountId={accountId}
          headingLevel={1}
          onDeleted={() => {
            router.replace(getLocalePath("/finance", locale));
          }}
        />
      ) : (
        <div css={stack.item} aria-busy>
          <Skeleton width="10rem" height="1.5rem" />
          <Skeleton width="100%" height="12rem" />
        </div>
      )}
    </div>
  );
}
