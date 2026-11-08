import { t } from "@tuja/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OwnerPetPage } from "#src/owner-page/owner-pet-page.tsx";
import { getPageAccount } from "#src/server/account/get-page-account.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { machineStore } from "#src/server/machines/machine-store.ts";
import {
  readCachedPublicPetState,
  readOwnPetState,
} from "#src/server/read-public-pet-state.ts";

type OwnerPageProps = {
  params: Promise<{ locale: string; user: string }>;
};

export async function generateMetadata({
  params,
}: OwnerPageProps): Promise<Metadata> {
  const { user } = await params;
  return {
    title: `${t({ en: "Miao", zh: "小苗" })} · @${user}`,
  };
}

export default async function OwnerPage({ params }: OwnerPageProps) {
  const { user } = await params;
  const viewer = await getPageAccount();
  const renderedAt = new Date().getTime();
  const db = getBuddyDb();
  if (viewer?.name === user && db) {
    const [state, machines] = await Promise.all([
      readOwnPetState(user),
      machineStore.list(db, viewer.userId),
    ]);
    if (state === null) notFound();
    return (
      <OwnerPetPage
        initialState={state}
        renderedAt={renderedAt}
        viewer={{
          kind: "owner",
          isPublic: viewer.isPublic,
          connectedMacs: machines.length,
        }}
      />
    );
  }
  const state = await readCachedPublicPetState(user);
  if (state === null) notFound();
  return (
    <OwnerPetPage
      initialState={state}
      renderedAt={renderedAt}
      viewer={{ kind: "visitor", ownName: viewer?.name ?? null }}
    />
  );
}
