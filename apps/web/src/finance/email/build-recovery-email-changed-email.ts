import { displayLocale } from "#src/finance/domain/dates/display-day.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { renderFinanceEmail } from "./render-finance-email.ts";
import type { FinanceEmail } from "./types.ts";

const COPY = {
  en: {
    subject: "Your Finance recovery email was changed",
    heading: "Your recovery email was changed",
    intro: (newEmail: string, when: string) =>
      `Your Finance recovery email changed from this address to ${newEmail} on ${when}. Recovery links now go to that address.`,
    notYou: "If you did not make this change",
    steps:
      "Sign in, change your recovery email back in Settings, under Members, and confirm it. Then sign out and get back in with a recovery code from the sign-in page. Your old passkeys then stop working, and every other device signs out.",
    action: "Open Settings",
    ignore: "If you made this change, you can ignore this email.",
  },
  zh: {
    subject: "家庭账本恢复邮箱已更改",
    heading: "你的恢复邮箱已更改",
    intro: (newEmail: string, when: string) =>
      `${when}，你的家庭账本恢复邮箱已从此邮箱改为 ${newEmail}。今后恢复链接会发到新邮箱。`,
    notYou: "如果不是你本人更改的",
    steps:
      "请登录，在设置的“成员”中把恢复邮箱改回来并完成确认。然后退出登录，在登录页用恢复验证码重新进入。之后旧的通行密钥将失效，其他设备都会退出登录。",
    action: "打开设置",
    ignore: "如果是你本人更改的，请忽略此邮件。",
  },
} satisfies Record<SupportedLocale, unknown>;

/** The address with its local part hidden after the first character: "j•••@example.com". */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return `${email.slice(0, Math.min(1, at))}•••${email.slice(at)}`;
}

/** The notice to the confirmed Recovery email that a User replaced, so that the person can act when they did not make the change. */
export function buildRecoveryEmailChangedEmail({
  to,
  locale,
  newEmail,
  changedAt,
  timeZone,
  settingsUrl,
}: {
  to: string;
  locale: SupportedLocale;
  newEmail: string;
  changedAt: Date;
  /** The Household's time zone, in which the email gives the time of the change. */
  timeZone: string;
  settingsUrl: string;
}): FinanceEmail {
  const copy = COPY[locale];
  const when = new Intl.DateTimeFormat(displayLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
    timeZoneName: "short",
  }).format(changedAt);
  return renderFinanceEmail({
    to,
    locale,
    subject: copy.subject,
    heading: copy.heading,
    intro: copy.intro(maskEmail(newEmail), when),
    actions: [
      {
        heading: copy.notYou,
        text: copy.steps,
        label: copy.action,
        url: settingsUrl,
      },
    ],
    ignore: copy.ignore,
  });
}
