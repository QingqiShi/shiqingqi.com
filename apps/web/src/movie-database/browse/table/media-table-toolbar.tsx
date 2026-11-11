"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { TextField } from "@tuja/ui/components/text-field";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { MediaColumn } from "./types";

interface MediaTableToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  columns: MediaColumn[];
  onColumnsChange: (next: MediaColumn[]) => void;
  exportDisabled: boolean;
  onExport: () => void;
}

export function MediaTableToolbar({
  search,
  onSearchChange,
  columns,
  onColumnsChange,
  exportDisabled,
  onExport,
}: MediaTableToolbarProps) {
  const searchLabel = t({ en: "Search loaded titles", zh: "搜索已加载的作品" });
  const columnsLabel = t({ en: "Columns", zh: "列" });
  const exportLabel = t({ en: "Export CSV", zh: "导出 CSV" });

  return (
    <div css={styles.toolbar}>
      <TextField
        label={searchLabel}
        labelHidden
        size="sm"
        type="search"
        value={search}
        onChange={(e) => {
          onSearchChange(e.target.value);
        }}
        placeholder={searchLabel}
        leading={<MagnifyingGlassIcon weight="bold" />}
        controlCss={styles.search}
      />
      <div css={styles.toolbarActions}>
        <MenuButton
          popupRole="group"
          position="topRight"
          buttonProps={{
            size: "sm",
            icon: <SlidersHorizontalIcon weight="bold" />,
            hideLabelOnMobile: true,
          }}
          menuContent={
            <div css={styles.columnMenu}>
              {columns.map((column) => (
                <Checkbox
                  key={column.id}
                  size="sm"
                  label={column.name ?? column.id}
                  checked={!column.hide}
                  onChange={(e) => {
                    const visible = e.target.checked;
                    onColumnsChange(
                      columns.map((candidate) =>
                        candidate.id === column.id
                          ? { ...candidate, hide: !visible }
                          : candidate,
                      ),
                    );
                  }}
                />
              ))}
            </div>
          }
        >
          {columnsLabel}
        </MenuButton>
        <Button
          size="sm"
          icon={<DownloadSimpleIcon weight="bold" />}
          hideLabelOnMobile
          // Export reads the grid API, and the grid is unmounted while
          // the empty state is showing — there is nothing to export and
          // an enabled button would just swallow the click.
          disabled={exportDisabled}
          onClick={onExport}
        >
          {exportLabel}
        </Button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
    backgroundColor: color.muted,
  },
  search: {
    inlineSize: { default: "100%", [breakpoints.md]: space._15 },
  },
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    marginInlineStart: "auto",
  },
  columnMenu: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    padding: space._1,
    minInlineSize: space._13,
  },
});
