import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Table } from "@tuja/ui/components/table";
import { TableBody } from "@tuja/ui/components/table-body";
import { TableCell } from "@tuja/ui/components/table-cell";
import { TableHead } from "@tuja/ui/components/table-head";
import { TableHeaderCell } from "@tuja/ui/components/table-header-cell";
import { TableRow } from "@tuja/ui/components/table-row";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { FolderProgress } from "../history/read-history-progress.ts";

function ModeLabel({ folder }: { folder: FolderProgress }) {
  switch (folder.mode) {
    case "index":
      return (
        <>
          {t({ en: "Filed as {category}", zh: "归为“{category}”" }).replace(
            "{category}",
            folder.category ?? "",
          )}
        </>
      );
    case "classify":
      return <>{t({ en: "Sorted by the assistant", zh: "由助手分拣" })}</>;
    case "recipients":
      return (
        <>{t({ en: "Read for people you wrote to", zh: "读取你写信的对象" })}</>
      );
    case "skip":
      return <>{t({ en: "Left out", zh: "不导入" })}</>;
  }
}

function StateBadge({ folder }: { folder: FolderProgress }) {
  if (folder.done) {
    return (
      <Badge intent="success" size="sm">
        {t({ en: "Done", zh: "完成" })}
      </Badge>
    );
  }
  if (folder.started) {
    return (
      <Badge intent="neutral" size="sm">
        {t({ en: "Importing", zh: "导入中" })}
      </Badge>
    );
  }
  return null;
}

/** The folders of one account, with how much of their old mail is stored and sorted. */
export function FolderTable({
  address,
  folders,
  formatNumber,
}: {
  address: string;
  folders: readonly FolderProgress[];
  formatNumber: (value: number) => string;
}) {
  const caption = t({
    en: "Folders of {address}",
    zh: "{address} 的文件夹",
  }).replace("{address}", address);
  const waiting = t({
    en: "{count} waiting for the assistant",
    zh: "{count} 封等待助手分拣",
  });
  const failed = t({
    en: "{count} failed; start the import again to retry them",
    zh: "{count} 封失败，重新开始导入即可重试",
  });
  const shown = folders.filter((folder) => folder.mode !== "skip");
  if (shown.length === 0) {
    return (
      <Text as="p" tone="muted">
        {t({
          en: "No folders yet. They show after the first sync.",
          zh: "还没有文件夹，首次同步后会显示。",
        })}
      </Text>
    );
  }
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TableHeaderCell scope="col">
            {t({ en: "Folder", zh: "文件夹" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "On the server", zh: "服务器上" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Stored", zh: "已存" })}
          </TableHeaderCell>
          <TableHeaderCell scope="col" numeric>
            {t({ en: "Sorted", zh: "已分拣" })}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {shown.map((folder) => (
          <TableRow key={folder.id}>
            <TableHeaderCell scope="row">
              <div css={stack.text}>
                <Text weight="medium">{folder.path}</Text>
                <Text look="bodySmall" tone="muted">
                  <ModeLabel folder={folder} />
                </Text>
                {folder.queued + folder.inBatch > 0 ? (
                  <Text look="bodySmall" tone="muted">
                    {waiting.replace(
                      "{count}",
                      formatNumber(folder.queued + folder.inBatch),
                    )}
                  </Text>
                ) : null}
                {folder.failed > 0 ? (
                  <Text look="bodySmall">
                    {failed.replace("{count}", formatNumber(folder.failed))}
                  </Text>
                ) : null}
                <div>
                  <StateBadge folder={folder} />
                </div>
              </div>
            </TableHeaderCell>
            <TableCell numeric>
              {folder.messageCount === null
                ? "–"
                : formatNumber(folder.messageCount)}
            </TableCell>
            <TableCell numeric>
              {folder.mode === "recipients" ? "–" : formatNumber(folder.stored)}
            </TableCell>
            <TableCell numeric>
              {folder.mode === "recipients"
                ? "–"
                : formatNumber(folder.classified)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
