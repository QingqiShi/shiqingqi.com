"use client";

import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { signInPath } from "@tuja/server-auth/sign-in-path";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Spinner } from "@tuja/ui/components/spinner";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  controlHeight,
  controlSize,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { passkeyClient } from "../auth/passkey-client.ts";

/**
 * Signs out. It sits under the Settings menu as one more row of it, on the
 * same icon and text edges, in the muted colour because it leaves the app.
 */
export function SignOutButton() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      aria-busy={busy || undefined}
      disabled={busy}
      css={[
        buttonReset.base,
        typeRole.label,
        a11y.touchRow,
        corner.radius_2,
        quietSurface.interactive,
        styles.row,
      ]}
      onClick={() => {
        setBusy(true);
        void passkeyClient
          .signOut()
          .catch(() => undefined)
          .then(() => {
            window.location.assign(signInPath(locale));
          });
      }}
    >
      <span css={styles.icon} aria-hidden>
        {busy ? (
          <Spinner size="inline" aria-hidden />
        ) : (
          <SignOutIcon weight="bold" />
        )}
      </span>
      {t({ en: "Sign out", zh: "退出登录" })}
    </button>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    inlineSize: "100%",
    minBlockSize: { default: controlHeight.sm, [pointer.coarse]: "44px" },
    paddingBlock: space._0,
    paddingInline: space._1,
    color: color.mutedForeground,
    textAlign: "start",
  },
  icon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: controlSize._4,
  },
});
