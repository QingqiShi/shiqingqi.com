"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { postJson } from "../http/post-json.ts";

export interface MacEntry {
  machineId: string;
  name: string;
  connectedAt: number;
  /** Null before the Mac's first upload. */
  lastUploadAt: number | null;
}

/** The owner's connected Macs, each with a way to remove it and its data. */
export function MacsList({ macs }: { macs: readonly MacEntry[] }) {
  const locale = useLocale();
  const router = useRouter();
  // Dates show in the browser's time zone, which the server does not know.
  const hydrated = useIsHydrated();
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<MacEntry | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const copy = {
    connected: t({ en: "Connected {date}", zh: "{date}连接" }),
    lastUpload: t({ en: "Last upload {date}", zh: "最近上传：{date}" }),
    noUpload: t({ en: "No upload yet", zh: "尚未上传" }),
    remove: t({ en: "Remove", zh: "移除" }),
    confirmTitle: t({ en: "Remove {name}?", zh: "移除 {name}？" }),
    removeOne: t({
      en: "Remove {name} and its data",
      zh: "移除 {name} 及其数据",
    }),
  };
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const time = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const shown = macs.filter(({ machineId }) => !removed.includes(machineId));

  function remove(mac: MacEntry) {
    setBusy(mac.machineId);
    setFailed(false);
    postJson("/api/machines/remove", { machineId: mac.machineId })
      .then(() => {
        setRemoved((ids) => [...ids, mac.machineId]);
        router.refresh();
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => {
        setBusy(null);
      });
  }

  return (
    <div css={stack.item}>
      {failed ? (
        <Callout intent="danger" role="alert">
          {t({
            en: "That Mac was not removed. Try again.",
            zh: "这台 Mac 没有移除，请重试。",
          })}
        </Callout>
      ) : null}
      {shown.length === 0 ? (
        <Text tone="muted">
          {t({
            en: "No Mac is connected. To connect one, turn on sync in the mod on that Mac.",
            zh: "还没有连接任何 Mac。要连接一台，请在那台 Mac 的插件里打开同步。",
          })}
        </Text>
      ) : (
        <List>
          {shown.map((mac) => (
            <li key={mac.machineId} css={listSurface.item}>
              <div css={[listSurface.row, styles.row]}>
                <div css={[stack.text, styles.text]}>
                  <Text>{mac.name}</Text>
                  <Text look="bodySmall" tone="muted">
                    {hydrated
                      ? copy.connected.replace(
                          "{date}",
                          day.format(mac.connectedAt),
                        )
                      : " "}
                  </Text>
                  <Text look="bodySmall" tone="muted">
                    {mac.lastUploadAt === null
                      ? copy.noUpload
                      : hydrated
                        ? copy.lastUpload.replace(
                            "{date}",
                            time.format(mac.lastUploadAt),
                          )
                        : " "}
                  </Text>
                </div>
                <Button
                  size="sm"
                  look="ghost"
                  loading={busy === mac.machineId}
                  disabled={busy !== null}
                  aria-label={copy.removeOne.replace("{name}", mac.name)}
                  onClick={() => {
                    setConfirming(mac);
                    setIsConfirmOpen(true);
                  }}
                >
                  {copy.remove}
                </Button>
              </div>
            </li>
          ))}
        </List>
      )}
      <Sheet
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        aria-label={copy.confirmTitle.replace("{name}", confirming?.name ?? "")}
        initialFocusRef={cancelRef}
      >
        {confirming ? (
          <div css={stack.group}>
            <div css={stack.item}>
              <Heading level={2} look="h3">
                {copy.confirmTitle.replace("{name}", confirming.name)}
              </Heading>
              <Text as="p" tone="muted">
                {t({
                  en: "The data this Mac uploaded is deleted too. This cannot be undone.",
                  zh: "这台 Mac 传上来的数据会一起删掉，不能恢复。",
                })}
              </Text>
            </div>
            <div css={cluster.tight}>
              <Button
                look="danger"
                onClick={() => {
                  remove(confirming);
                  setIsConfirmOpen(false);
                }}
              >
                {copy.remove}
              </Button>
              <Button
                ref={cancelRef}
                look="ghost"
                onClick={() => {
                  setIsConfirmOpen(false);
                }}
              >
                {t({ en: "Cancel", zh: "取消" })}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

const styles = stylex.create({
  row: {
    paddingBlock: space._2,
  },
  text: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
