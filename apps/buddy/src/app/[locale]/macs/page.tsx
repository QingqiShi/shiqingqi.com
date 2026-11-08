import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Anchor } from "#src/links/anchor.tsx";
import { MacsList } from "#src/macs-page/macs-list.tsx";
import { SignOutButton } from "#src/macs-page/sign-out-button.tsx";
import { requirePageSession } from "#src/server/auth/require-page-session.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { accountNameOf } from "#src/server/machines/account-name-of.ts";
import { machineStore } from "#src/server/machines/machine-store.ts";
import { readSnapshots } from "#src/server/snapshot/read-snapshots.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";
import { AuthFrame } from "#src/sign-in/auth-frame.tsx";
import { NotConfigured } from "#src/sign-in/not-configured.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Your Macs", zh: "你的 Mac" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await connection();
  const db = getBuddyDb();
  if (!db) return <NotConfigured />;
  const { userId } = await requirePageSession(locale, "/macs");
  const [name, machines] = await Promise.all([
    accountNameOf(db, userId),
    machineStore.list(db, userId),
  ]);
  const snapshots = await readSnapshots(
    getBuddyBackend().kv,
    machines.map((machine) => machine.machineId),
  );

  return (
    <AuthFrame>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Your Macs", zh: "你的 Mac" })}
        </Heading>
        <Text tone="muted">
          {t({
            en: "These Macs can sync your pet. Remove one and its uploads stop at once, and the days it sent no longer count.",
            zh: "这些 Mac 可以同步你的宠物。移除一台后，它的上传立即停止，它上传过的天数也不再计入。",
          })}
        </Text>
      </div>
      <MacsList
        macs={machines.map((machine) => ({
          machineId: machine.machineId,
          name: machine.name,
          connectedAt: machine.createdAt.getTime(),
          lastUploadAt: snapshots.get(machine.machineId)?.receivedAt ?? null,
        }))}
      />
      <div css={[row.item, styles.footer]}>
        {name ? (
          <Anchor href={getLocalePath(`/u/${name}`, locale)}>
            {t({ en: "See your pet", zh: "去看看你的宠物" })}
          </Anchor>
        ) : null}
        <SignOutButton />
      </div>
    </AuthFrame>
  );
}

const styles = stylex.create({
  footer: {
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
});
