"use client";

import * as stylex from "@stylexjs/stylex";
import { Select } from "@tuja/ui/components/select";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { StateReadout } from "../../showcase.tsx";

export function LiveSelect() {
  const genres = [
    { value: "action", label: t({ en: "Action", zh: "动作" }) },
    { value: "drama", label: t({ en: "Drama", zh: "剧情" }) },
    { value: "comedy", label: t({ en: "Comedy", zh: "喜剧" }) },
  ];
  const [value, setValue] = useState("");
  const selected = genres.find((genre) => genre.value === value);
  return (
    <div css={styles.liveStack}>
      <div css={[fill.inline, styles.constrained]}>
        <Select
          label={t({ en: "Genre", zh: "类型" })}
          placeholder={t({ en: "Pick a genre", zh: "选择类型" })}
          options={genres}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </div>
      <StateReadout label={t({ en: "onChange →", zh: "onChange →" })}>
        {selected ? selected.label : t({ en: "none", zh: "无" })}
      </StateReadout>
    </div>
  );
}

const styles = stylex.create({
  liveStack: {
    display: "flex",
    flexDirection: "column",
    inlineSize: "100%",
    gap: space._3,
  },
  constrained: {
    maxInlineSize: "20rem",
  },
});
