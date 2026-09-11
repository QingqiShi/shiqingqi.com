"use client";

import * as stylex from "@stylexjs/stylex";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";

export function SelectAllGroup() {
  const options = [
    t({ en: "Product updates", zh: "产品更新" }),
    t({ en: "Weekly digest", zh: "每周摘要" }),
    t({ en: "Security alerts", zh: "安全提醒" }),
  ];
  const [checked, setChecked] = useState([true, false, false]);
  const selectedCount = checked.filter(Boolean).length;
  const allChecked = selectedCount === checked.length;
  const noneChecked = selectedCount === 0;
  return (
    <div css={styles.group}>
      <Checkbox
        label={t({ en: "All notifications", zh: "全部通知" })}
        checked={allChecked}
        indeterminate={!allChecked && !noneChecked}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(checked.map(() => next));
        }}
      />
      <div css={styles.children}>
        {options.map((label, index) => (
          <Checkbox
            key={label}
            label={label}
            checked={checked[index]}
            onChange={(event) => {
              const next = event.target.checked;
              setChecked(
                checked.map((value, other) => (other === index ? next : value)),
              );
            }}
          />
        ))}
      </div>
      <Text look="bodySmall" tone="muted">
        {t({ en: "Selected", zh: "已选择" })} {selectedCount} / {checked.length}
      </Text>
    </div>
  );
}

const styles = stylex.create({
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  children: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingInlineStart: space._5,
  },
});
