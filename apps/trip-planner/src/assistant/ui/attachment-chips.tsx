"use client";

import { FilePdfIcon } from "@phosphor-icons/react/dist/ssr/FilePdf";
import { ImageIcon } from "@phosphor-icons/react/dist/ssr/Image";
import { TextAlignLeftIcon } from "@phosphor-icons/react/dist/ssr/TextAlignLeft";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { border, controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { AttachmentChip } from "#src/assistant/assistant-api.ts";
import type { AttachmentKind } from "#src/assistant/check-attachments.ts";

const ICONS = {
  image: ImageIcon,
  pdf: FilePdfIcon,
  text: TextAlignLeftIcon,
} as const;

function useKindWords(): Record<AttachmentKind, string> {
  return {
    image: t({ en: "Image", zh: "图片" }),
    pdf: t({ en: "PDF", zh: "PDF" }),
    text: t({ en: "Text", zh: "文字" }),
  };
}

interface ChipEntry {
  key: string;
  name: string;
  kind: AttachmentKind;
  state?: AttachmentChip["state"];
}

/**
 * The files of a message, one chip each: its kind and its name. In the
 * prompt field a chip has a button that takes it out; in the conversation
 * it says when the file could not be read.
 */
export function AttachmentChips({
  chips,
  onRemove,
}: {
  chips: readonly ChipEntry[];
  onRemove?: (key: string) => void;
}) {
  const kindWords = useKindWords();
  const failed = t({ en: "Could not be read", zh: "没能读取" });
  const removeLabel = t({ en: "Remove {name}", zh: "移除 {name}" });
  return (
    <ul css={styles.list}>
      {chips.map((chip) => {
        const Icon = ICONS[chip.kind];
        return (
          <li
            key={chip.key}
            css={[
              row.tight,
              styles.chip,
              onRemove && styles.removable,
              chip.state === "failed" && styles.failed,
            ]}
          >
            <Icon weight="bold" aria-label={kindWords[chip.kind]} role="img" />
            <Text as="span" look="caption" verbatim css={styles.name}>
              {chip.name}
            </Text>
            {chip.state === "failed" ? (
              <Text as="span" look="caption" tone="destructive">
                {failed}
              </Text>
            ) : null}
            {onRemove ? (
              <Button
                size="xs"
                look="ghost"
                aria-label={removeLabel.replace("{name}", chip.name)}
                icon={<XIcon weight="bold" />}
                onClick={() => {
                  onRemove(chip.key);
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

const styles = stylex.create({
  list: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.tight,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  chip: {
    boxSizing: "border-box",
    maxInlineSize: "100%",
    minBlockSize: controlHeight.sm,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_2,
    cornerShape: "squircle",
    backgroundColor: color.card,
    color: color.mutedForeground,
  },
  removable: {
    paddingInlineEnd: 0,
  },
  failed: {
    borderColor: color.destructive,
  },
  name: {
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: color.foreground,
  },
});
