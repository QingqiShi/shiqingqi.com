import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { EmptyState } from "@tuja/ui/components/empty-state";
import type { Metadata } from "next";
import { ReloadWhenOnline } from "#src/pwa/reload-when-online.tsx";
import { StandalonePage } from "#src/shell/standalone-page.tsx";

interface OfflinePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: OfflinePageProps): Promise<Metadata> {
  validateLocale((await params).locale);
  return { title: t({ en: "Offline", zh: "当前离线" }) };
}

// Served by the service worker when a navigation has no network and no cached
// copy. Pages the visitor has opened before are served from cache instead and
// never reach this fallback.
export default async function OfflinePage({ params }: OfflinePageProps) {
  const locale = validateLocale((await params).locale);
  return (
    <StandalonePage>
      <ReloadWhenOnline />
      <EmptyState
        level={2}
        icon={<WifiSlashIcon weight="bold" />}
        title={t({ en: "You are offline", zh: "当前处于离线状态" })}
        description={t({
          en: "This page is not saved on this device yet. A trip you have opened is saved, so open it once more when you are back online, and it reads offline after that.",
          zh: "这个页面还没有离线缓存。打开过的行程会自动保存在本机，恢复网络后再访问一次即可离线查看。",
        })}
        action={
          <Button href={getLocalePath("/", locale)} look="outline">
            {t({ en: "Back to the trips", zh: "返回首页" })}
          </Button>
        }
      />
    </StandalonePage>
  );
}
