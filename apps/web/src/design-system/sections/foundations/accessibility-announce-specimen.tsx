"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useState } from "react";

/**
 * A real form, so a screen reader hears the real announcements: the error
 * interrupts, and the status waits for a pause.
 */
export function AccessibilityAnnounceSpecimen() {
  const [email, setEmail] = useState("qingqi.dev");
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState("");
  const errorText = t({
    en: "Enter an address that includes an @.",
    zh: "输入包含 @ 的地址。",
  });
  const savedText = t({
    en: "Saved. We will write to this address.",
    zh: "已保存。我们会发邮件到这个地址。",
  });

  return (
    <form
      noValidate
      css={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (email.includes("@")) {
          setError(undefined);
          setStatus(savedText);
        } else {
          setStatus("");
          setError(errorText);
        }
      }}
    >
      <div css={styles.field}>
        <TextField
          type="email"
          label={t({ en: "Email", zh: "电子邮箱" })}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setStatus("");
          }}
          error={error}
          status={status}
        />
      </div>
      <Button type="submit">{t({ en: "Save", zh: "保存" })}</Button>
    </form>
  );
}

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: rhythm.item,
  },
  field: {
    inlineSize: "100%",
    maxInlineSize: "24rem",
  },
});
