import { useAuthErrorMessage as useSharedAuthErrorMessage } from "@tuja/auth-ui/use-auth-error-message";
import { t } from "@tuja/i18n";

/** The shared sign-in copy for an `ApiError`, and the copy for the errors of Finance's own auth routes. */
export function useAuthErrorMessage() {
  return useSharedAuthErrorMessage({
    invite_invalid: t({
      en: "This invite has expired or was used already.",
      zh: "此邀请已过期或已被使用。",
    }),
    already_member: t({
      en: "You belong to a household already. An account can be in one household.",
      zh: "你已属于一个家庭。一个账号只能加入一个家庭。",
    }),
    member_claimed: t({
      en: "Someone has joined as this member already. If it was you, sign in.",
      zh: "已有人以该成员身份加入。如果是你，请直接登录。",
    }),
    owner_only: t({
      en: "Only the household owner can do this.",
      zh: "只有家庭所有者可以这样做。",
    }),
    demo_not_found: t({
      en: "The demo is not available right now.",
      zh: "演示暂时无法使用。",
    }),
  });
}
