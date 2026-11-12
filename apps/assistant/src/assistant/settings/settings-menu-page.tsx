import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SignOutButton } from "../shell/sign-out-button.tsx";
import { SettingsMenu } from "./settings-menu.tsx";

/** `/settings`: the menu of sections, then the way to sign out. */
export function SettingsMenuPage({
  mailboxNeedsYou,
}: {
  mailboxNeedsYou: boolean;
}) {
  return (
    <div css={stack.group}>
      <Heading level={1} look="h3">
        {t({ en: "Settings", zh: "设置" })}
      </Heading>
      <SettingsMenu mailboxNeedsYou={mailboxNeedsYou} />
      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
