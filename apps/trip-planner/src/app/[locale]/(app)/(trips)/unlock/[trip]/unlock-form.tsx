"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useActionState } from "react";
import { type UnlockState, unlockTrip } from "./unlock-trip.ts";

const initialState: UnlockState = {};

export function UnlockForm({ slug }: { slug: string }) {
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(unlockTrip, initialState);
  const errors = {
    "wrong-password": t({
      en: "That password is not right. Try again.",
      zh: "密码错误，请重试",
    }),
    unavailable: t({
      en: "The password cannot be checked now. Try again later.",
      zh: "暂时无法验证密码，请稍后再试",
    }),
  };

  return (
    <form action={formAction} css={[stack.item, styles.form]}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <TextField
        autoFocus
        type="password"
        name="password"
        autoComplete="current-password"
        label={t({ en: "Trip password", zh: "行程密码" })}
        error={state.error ? errors[state.error] : undefined}
      />
      <Button type="submit" look="primary" loading={pending}>
        {t({ en: "Open the trip", zh: "进入行程" })}
      </Button>
    </form>
  );
}

const styles = stylex.create({
  form: {
    inlineSize: "min(100%, 20rem)",
    textAlign: "start",
  },
});
