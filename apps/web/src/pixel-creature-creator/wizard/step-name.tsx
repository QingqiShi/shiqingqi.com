"use client";

import * as stylex from "@stylexjs/stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { t } from "#src/i18n.ts";
import {
  type CreatureDef,
  NAME_MAX_LENGTH,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";

interface StepNameProps {
  def: CreatureDef;
  onChange: (next: CreatureDef) => void;
}

export function StepName({ def, onChange }: StepNameProps) {
  // Trim happens at submit time (the wizard "Finish" handler) so the user
  // can still type whitespace mid-edit; the input shows the raw value.
  // Keep this empty-name rule in lockstep with `wizard-shell.tsx`'s
  // `nameTooShort` — both gate Finish on the trimmed length.
  const isEmpty = def.name.trim().length === 0;
  const hintId = useId();
  const errorId = useId();
  // Always include hintId so the constraint announces alongside the field;
  // append errorId only when the empty-state error message is rendered.
  const describedBy = isEmpty ? `${hintId} ${errorId}` : hintId;

  return (
    <section css={stack.item} data-testid="wizard-step-name">
      <div css={stack.tight}>
        <h3 css={[typeRole.h3, styles.heading]}>
          {t({ en: "Name your creature", zh: "为生物命名" })}
        </h3>
        <p id={hintId} css={[typeRole.bodySmall, styles.hint]}>
          {t({
            en: "1–20 characters. We will auto-trim leading and trailing spaces when you finish.",
            zh: "1–20 个字符。完成时会自动去除首尾空格。",
          })}
        </p>
      </div>
      <div css={stack.tight}>
        <label css={stack.tight}>
          <span css={[typeRole.label, styles.labelText]}>
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
            aria-required="true"
            aria-invalid={isEmpty}
            aria-describedby={describedBy}
            placeholder={t({ en: "e.g. Mochi", zh: "例如:团子" })}
            data-testid="creature-name-input"
            css={[typeRole.body, styles.input, transition.colors]}
          />
        </label>
        {/*
        Empty-name error is the *reason* the Finish button is disabled, so
        announce it alongside the input via aria-describedby + an
        aria-live="polite" region. `aria-live` makes the message also
        announce the moment the user backspaces the last character without
        having to re-focus the field.
      */}
        <p
          id={errorId}
          aria-live="polite"
          css={[typeRole.bodySmall, styles.error]}
          data-testid="creature-name-error"
        >
          {isEmpty
            ? t({
                en: "Name is required to finish.",
                zh: "需要填写名字才能完成。",
              })
            : ""}
        </p>
      </div>
      <div css={[stack.tight, styles.lorePanel]} data-testid="lore-placeholder">
        <h4 css={[typeRole.label, styles.loreTitle]}>
          {t({ en: "Lore coming next", zh: "下一步:背景故事" })}
        </h4>
        <p css={[typeRole.bodySmall, styles.loreBody]}>
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
  heading: {
    margin: 0,
    color: color.fg,
  },
  hint: {
    color: color.fgMuted,
    margin: 0,
  },
  labelText: {
    color: color.fgMuted,
  },
  input: {
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: "10px",
    cornerShape: "squircle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: color.border,
      ":focus": color.borderAccent,
    },
    backgroundColor: color.bgSurfaceSunken,
    color: color.fg,
    outlineWidth: 0,
  },
  // Always reserve a line of vertical space so the input doesn't jump as
  // the message appears/disappears.
  error: {
    margin: 0,
    minHeight: "1.2em",
    color: color.fgDanger,
  },
  lorePanel: {
    padding: space._3,
    borderRadius: "12px",
    cornerShape: "squircle",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  loreTitle: {
    margin: 0,
    color: color.fg,
    fontWeight: font.weight_6,
  },
  loreBody: {
    margin: 0,
    color: color.fgMuted,
  },
});
