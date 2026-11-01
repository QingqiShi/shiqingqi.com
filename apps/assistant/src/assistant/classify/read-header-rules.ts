/** What the rules read of a stored mail. */
export interface MailForRules {
  fromAddress: string | null;
  subject: string;
  snippet: string;
  listId: string | null;
  listUnsubscribe: string | null;
  autoSubmitted: string | null;
  precedence: string | null;
}

/** What the headers and the text say for sure, whatever the model answers. */
export interface HeaderSignals {
  /** Sent to a list: List-Id or List-Unsubscribe, or Precedence bulk, list or junk. */
  bulk: boolean;
  /** Made by a machine: an Auto-Submitted header other than `no`. */
  automated: boolean;
  securityAlert: boolean;
  oneTimeCode: boolean;
}

export type HeaderRule = "one-time-code" | "auto-reply";

export interface HeaderRuleResult {
  signals: HeaderSignals;
  /** Set when a rule decides the mail without the model: such mail is always `fyi`. */
  rule: HeaderRule | null;
}

const CODE_WORDS =
  /verification code|security code|confirmation code|one[- ]time (?:code|pass(?:word|code)?)|\bOTP\b|passcode|(?:log ?in|sign[- ]in) code|验证码|校验码|动态码|动态密码|确认码|一次性密码/gi;
const CODE = /(?<![\d-])\d{3}[- ]?\d{3}(?![\d-])|(?<![\d-])\d{4,8}(?![\d-])/;

const SECURITY_SUBJECT =
  /security alert|security notice|new (?:sign[- ]?in|log[- ]?in|device)|signed in|sign-in attempt|unusual (?:sign[- ]?in|activity)|suspicious|password (?:was |has been )?(?:changed|reset)|your password|2-step verification|two-factor|安全提醒|安全警报|安全通知|登录提醒|登录通知|新设备|异地登录|异常登录|密码已(?:修改|更改|重置)|账号安全|帐号安全/i;

const AUTO_REPLY_SUBJECT =
  /^(?:automatic reply|auto(?:matic)?[- ]?reply|out of (?:the )?office)\b|^自动回复/i;

/** How far from the words "verification code" the code itself may be. */
const CODE_DISTANCE = 120;

function hasOneTimeCode(mail: MailForRules) {
  const text = `${mail.subject}\n${mail.snippet.slice(0, 2000)}`;
  for (const found of text.matchAll(CODE_WORDS)) {
    const near = text.slice(
      Math.max(0, found.index - CODE_DISTANCE),
      found.index + found[0].length + CODE_DISTANCE,
    );
    if (CODE.test(near)) return true;
  }
  return false;
}

/**
 * The header rules: they run before the model. A one-time code and an
 * auto-reply are `fyi` without a model call; the signals go to the truth
 * table for every other mail.
 */
export function readHeaderRules(mail: MailForRules): HeaderRuleResult {
  const precedence = mail.precedence?.toLowerCase() ?? "";
  const autoSubmitted = mail.autoSubmitted?.toLowerCase() ?? "";
  const signals: HeaderSignals = {
    bulk:
      mail.listId !== null ||
      mail.listUnsubscribe !== null ||
      ["bulk", "list", "junk"].includes(precedence),
    automated: autoSubmitted !== "" && autoSubmitted !== "no",
    securityAlert: SECURITY_SUBJECT.test(mail.subject),
    oneTimeCode: hasOneTimeCode(mail),
  };
  const autoReply =
    autoSubmitted.startsWith("auto-replied") ||
    AUTO_REPLY_SUBJECT.test(mail.subject.trim());
  return {
    signals,
    rule: signals.oneTimeCode
      ? "one-time-code"
      : autoReply
        ? "auto-reply"
        : null,
  };
}
