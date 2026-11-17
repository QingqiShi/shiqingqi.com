import { t } from "@tuja/i18n";
import { PageHeader } from "@tuja/ui/components/page-header";
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
      <PageHeader size="sm" title={t({ en: "Settings", zh: "设置" })} />
      <SettingsMenu mailboxNeedsYou={mailboxNeedsYou} />
      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
