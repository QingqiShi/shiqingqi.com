"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { type CreatureDef, NAME_MAX_LENGTH } from "../state/creature-schema";

interface StepNameProps {
  def: CreatureDef;
  onChange: (next: CreatureDef) => void;
}

export function StepName({ def, onChange }: StepNameProps) {
  // Trim happens at submit time (the wizard "Finish" handler) so the user
  // can still type whitespace mid-edit; the input shows the raw value.
  return (
    <section css={styles.root} data-testid="wizard-step-name">
      <h3 css={styles.heading}>
        {t({ en: "Name your creature", zh: "为生物命名" })}
      </h3>
      <p css={styles.hint}>
        {t({
          en: "1–20 characters. We will auto-trim leading and trailing spaces when you finish.",
          zh: "1–20 个字符。完成时会自动去除首尾空格。",
        })}
      </p>
      <label css={styles.label}>
        <span css={styles.labelText}>
          {t({ en: "Creature name", zh: "生物名字" })}
        </span>
        <input
          type="text"
          value={def.name}
          onChange={(event) => {
            const next = event.target.value.slice(0, NAME_MAX_LENGTH);
            onChange({ ...def, name: next });
          }}
          maxLength={NAME_MAX_LENGTH}
          placeholder={t({ en: "e.g. Mochi", zh: "例如:团子" })}
          data-testid="creature-name-input"
          css={styles.input}
        />
      </label>
      <div css={styles.lorePanel} data-testid="lore-placeholder">
        <h4 css={styles.loreTitle}>
          {t({ en: "Lore coming next", zh: "下一步:背景故事" })}
        </h4>
        <p css={styles.loreBody}>
          {t({
            en: "Once you finish, we will spin up a short bilingual backstory based on the choices you made.",
            zh: "完成后,我们将根据你的选择生成一段简短的双语背景故事。",
          })}
        </p>
      </div>
    </section>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  heading: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_6,
    margin: 0,
    color: color.textMain,
  },
  hint: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  labelText: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  input: {
    fontSize: font.uiBody,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: "10px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: { default: color.border, ":focus": color.controlActive },
    backgroundColor: color.backgroundMain,
    color: color.textMain,
    outlineWidth: 0,
    transitionProperty: "border-color",
    transitionDuration: "120ms",
  },
  lorePanel: {
    marginTop: space._2,
    padding: space._3,
    borderRadius: "12px",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: color.border,
    backgroundColor: color.backgroundRaised,
  },
  loreTitle: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    margin: 0,
    color: color.textMain,
  },
  loreBody: {
    marginTop: space._1,
    marginBottom: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
});
