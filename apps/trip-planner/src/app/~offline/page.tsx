import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "当前离线",
};

// Served by the service worker when a navigation has no network and no cached
// copy. Pages the visitor has opened before are served from cache instead and
// never reach this fallback.
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold tracking-tight">
        当前处于离线状态
      </h1>
      <p className="max-w-prose text-muted-foreground text-pretty">
        这个页面还没有离线缓存。打开过的行程会自动保存在本机，恢复网络后再访问一次即可离线查看。
      </p>
      <Link
        href="/"
        className="rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        返回首页
      </Link>
    </div>
  );
}
