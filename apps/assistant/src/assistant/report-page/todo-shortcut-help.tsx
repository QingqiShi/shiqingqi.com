"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";

/** The keys of a list of to-dos. It names only those that this page has. */
export function TodoShortcutHelp({
  isOpen,
  canAdd,
  canSearch,
  onClose,
}: {
  isOpen: boolean;
  canAdd: boolean;
  canSearch: boolean;
  onClose: () => void;
}) {
  const entries = [
    ...(canAdd
      ? [{ keys: ["n"], text: t({ en: "New to-do", zh: "新建待办" }) }]
      : []),
    ...(canSearch
      ? [{ keys: ["/"], text: t({ en: "Search", zh: "搜索" }) }]
      : []),
    {
      keys: ["j", "k"],
      text: t({ en: "Next and previous to-do", zh: "下一项和上一项" }),
    },
    { keys: ["e"], text: t({ en: "Edit", zh: "编辑" }) },
    {
      keys: ["x"],
      text: t({
        en: "Done, or reopen. With a selection, all of it is done",
        zh: "完成或重新打开。有选中项时，全部完成",
      }),
    },
    {
      keys: [t({ en: "Space", zh: "空格" })],
      text: t({ en: "Select", zh: "选择" }),
    },
    {
      keys: [t({ en: "Shift-click", zh: "Shift + 点击" })],
      text: t({ en: "Select all from the last one", zh: "选择到上一次选中处" }),
    },
    {
      keys: ["Esc"],
      text: t({ en: "End the selection", zh: "结束选择" }),
    },
    { keys: ["?"], text: t({ en: "This list", zh: "这份列表" }) },
  ];

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      title={t({ en: "Keyboard shortcuts", zh: "键盘快捷键" })}
    >
      <dl css={[stack.tight, styles.list]}>
        {entries.map(({ keys, text }) => (
          <div key={keys.join()} css={styles.entry}>
            <dt css={styles.keys}>
              {keys.map((key) => (
                <kbd
                  key={key}
                  css={[typeRole.caption, corner.radius_1, styles.key]}
                >
                  {key}
                </kbd>
              ))}
            </dt>
            <dd css={styles.text}>
              <Text look="bodySmall">{text}</Text>
            </dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
  },
  entry: {
    display: "grid",
    gridTemplateColumns: "7rem 1fr",
    gap: rhythm.item,
    alignItems: "baseline",
  },
  keys: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.inline,
  },
  key: {
    paddingInline: space._1,
    fontFamily: font.familyMono,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgNeutralSubtle,
  },
  text: {
    margin: 0,
  },
});
