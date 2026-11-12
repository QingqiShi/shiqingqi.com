"use client";

import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SettingsFinanceLogo } from "./settings-finance-logo.tsx";
import { SettingsMenu } from "./settings-menu.tsx";
import { SettingsSignedInMember } from "./settings-signed-in-member.tsx";

/**
 * `/settings`: the menu of sections. Below `md` it also shows the signed-in
 * Member and the Finance mark.
 */
export function SettingsMenuPage() {
  return (
    <div css={stack.group}>
      <Heading level={1} look="h3">
        {t({ en: "Settings", zh: "设置" })}
      </Heading>
      <SettingsMenu />
      <SettingsSignedInMember />
      <SettingsFinanceLogo />
    </div>
  );
}
