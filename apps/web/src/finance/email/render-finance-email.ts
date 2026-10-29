import type { SupportedLocale } from "@tuja/i18n/types";
import type { FinanceEmail } from "./types.ts";

/** A button that opens `url`, under an optional heading and an optional line that says what to do there. */
interface FinanceEmailAction {
  heading?: string;
  text?: string;
  label: string;
  url: string;
}

const COPY = {
  en: {
    wordmark: "Finance",
    copyLink: "Or copy this link:",
    ignore: "If you did not ask for this, ignore this email.",
  },
  zh: {
    wordmark: "家庭账本",
    copyLink: "或复制此链接：",
    ignore: "如果不是你本人申请，请忽略此邮件。",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

// The `@tuja/ui` colour tokens, resolved, because email has no CSS variables.
const LIGHT = {
  canvas: "#FBF9F6",
  surface: "#FFFFFF",
  border: "#EFEDEA",
  fg: "#2B2C29",
  fgMuted: "#656562",
  accent: "#A043D0",
  fgOnAccent: "#FFFFFF",
};

const DARK: typeof LIGHT = {
  canvas: "#000000",
  surface: "#131412",
  border: "#2B2C29",
  fg: "#F2F0ED",
  fgMuted: "#DFDDDA",
  accent: "#E3A3FF",
  fgOnAccent: "#000000",
};

const FONT_FAMILY = [
  "Inter",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  '"PingFang SC"',
  '"Hiragino Sans GB"',
  '"Microsoft YaHei"',
  '"Noto Sans CJK SC"',
  '"Noto Sans SC"',
  "sans-serif",
].join(",");

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

function style(declarations: Record<string, string>): string {
  return escapeHtml(
    Object.entries(declarations)
      .map(([property, value]) => `${property}:${value}`)
      .join(";"),
  );
}

const text = {
  "font-family": FONT_FAMILY,
  "mso-line-height-rule": "exactly",
};

function renderButton(action: FinanceEmailAction, quiet: boolean): string {
  const url = escapeHtml(action.url);
  const colors = quiet
    ? { fill: LIGHT.surface, label: LIGHT.accent }
    : { fill: LIGHT.accent, label: LIGHT.fgOnAccent };
  const className = quiet ? "button-quiet" : "button";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="${className}" bgcolor="${colors.fill}" style="${style({ "border-radius": "14px", "background-color": colors.fill })}"><a class="${className}" href="${url}" target="_blank" style="${style({ ...text, display: "inline-block", padding: "13px 24px", border: `1px solid ${LIGHT.accent}`, "border-radius": "14px", "background-color": colors.fill, color: colors.label, "font-size": "16px", "line-height": "20px", "font-weight": "500", "text-decoration": "none" })}">${escapeHtml(action.label)}</a></td></tr></table>`;
}

function renderAction(
  action: FinanceEmailAction,
  copyLink: string,
  quiet: boolean,
): string {
  const url = escapeHtml(action.url);
  const heading = action.heading
    ? `<p class="fg" style="${style({ ...text, margin: "0 0 12px", "font-size": "17px", "line-height": "24px", "font-weight": "600", color: LIGHT.fg })}">${escapeHtml(action.heading)}</p>`
    : "";
  const line = action.text
    ? `<p class="fg" style="${style({ ...text, margin: "0 0 16px", "font-size": "16px", "line-height": "24px", color: LIGHT.fg })}">${escapeHtml(action.text)}</p>`
    : "";
  return `${heading}${line}${renderButton(action, quiet)}
<p class="muted" style="${style({ ...text, margin: "16px 0 0", "font-size": "13px", "line-height": "20px", color: LIGHT.fgMuted })}">${escapeHtml(copyLink)}<br><a class="muted" href="${url}" target="_blank" style="${style({ color: LIGHT.fgMuted, "text-decoration": "underline", "word-break": "break-all" })}">${url}</a></p>`;
}

/** A block under a rule, so that it reads as a separate part. */
function ruledRow(body: string): string {
  return `<tr><td style="padding-top:24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="rule" style="${style({ "border-top": `1px solid ${LIGHT.border}`, "padding-top": "24px" })}">${body}</td></tr></table></td></tr>`;
}

function renderCode({ value, hint }: FinanceEmailCode): string {
  return `<tr><td style="padding-top:28px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="code" bgcolor="${LIGHT.canvas}" style="${style({ padding: "14px 24px 14px 28px", "background-color": LIGHT.canvas, border: `1px solid ${LIGHT.border}`, "border-radius": "12px" })}">
<p class="fg" style="${style({ ...text, margin: "0", "font-size": "40px", "line-height": "48px", "font-weight": "600", "letter-spacing": "0.18em", "font-variant-numeric": "tabular-nums", color: LIGHT.fg })}">${escapeHtml(value)}</p>
</td></tr></table>
<p class="muted" style="${style({ ...text, margin: "12px 0 0", "font-size": "14px", "line-height": "21px", color: LIGHT.fgMuted })}">${escapeHtml(hint)}</p>
</td></tr>`;
}

function renderActionRows(
  { action, code }: FinanceEmailContent,
  copyLink: string,
): string {
  if (!code) {
    return `<tr><td style="padding-top:32px">${renderAction(action, copyLink, false)}</td></tr>`;
  }
  const alternative = `<p class="fg" style="${style({ ...text, margin: "0 0 16px", "font-size": "16px", "line-height": "24px", color: LIGHT.fg })}">${escapeHtml(code.alternative)}</p>`;
  return [
    renderCode(code),
    ruledRow(`${alternative}${renderAction(action, copyLink, true)}`),
  ].join("\n");
}

/** A code to type on the device that asked for the email. It leads the email, and the action becomes the other way in. */
interface FinanceEmailCode {
  value: string;
  /** Where to type the code. */
  hint: string;
  /** The line that brings in the action. */
  alternative: string;
}

interface FinanceEmailContent {
  to: string;
  locale: SupportedLocale;
  subject: string;
  heading: string;
  intro: string;
  code?: FinanceEmailCode;
  action: FinanceEmailAction;
  /** How long the code and the links work. */
  expiry?: string;
  /** The last note. By default it says to ignore the email when you did not ask for it. */
  ignore?: string;
}

/**
 * A Finance email: a heading, an intro, an optional code to type, a button
 * with its link also as text, and quieter notes below, which end with
 * "ignore this email". The plain-text body has the same parts.
 */
export function renderFinanceEmail(content: FinanceEmailContent): FinanceEmail {
  const { to, locale, subject, intro, code, action, expiry, ignore } = content;
  const notes = [...(expiry ? [expiry] : []), ignore ?? COPY[locale].ignore];
  const link = [action.heading, action.text, action.url]
    .filter((part) => part !== undefined)
    .join("\n");
  return {
    to,
    subject,
    text: [
      intro,
      ...(code ? [code.value, code.hint, code.alternative] : []),
      link,
      ...notes,
    ].join("\n\n"),
    html: renderHtml(content, notes),
  };
}

/** Every value is escaped, because a Household name is user input. */
function renderHtml(content: FinanceEmailContent, notes: string[]): string {
  const { locale, subject, heading, intro } = content;
  const copy = COPY[locale];
  const lang = locale === "zh" ? "zh-CN" : "en";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
@media (max-width: 480px) {
  .page { padding: 16px 12px 32px !important; }
  .card { padding: 28px 24px 32px !important; }
  .wordmark { padding: 0 25px 16px !important; }
}
@media (prefers-color-scheme: dark) {
  .canvas { background-color: ${DARK.canvas} !important; }
  .card { background-color: ${DARK.surface} !important; border-color: ${DARK.border} !important; }
  .fg { color: ${DARK.fg} !important; }
  .muted, .muted a { color: ${DARK.fgMuted} !important; }
  .rule { border-color: ${DARK.border} !important; }
  .button { background-color: ${DARK.accent} !important; border-color: ${DARK.accent} !important; color: ${DARK.fgOnAccent} !important; }
  .button-quiet { background-color: ${DARK.surface} !important; border-color: ${DARK.accent} !important; color: ${DARK.accent} !important; }
  .code { background-color: ${DARK.canvas} !important; border-color: ${DARK.border} !important; }
}
[data-ogsc] .fg { color: ${DARK.fg} !important; }
[data-ogsc] .muted { color: ${DARK.fgMuted} !important; }
[data-ogsb] .canvas { background-color: ${DARK.canvas} !important; }
[data-ogsb] .card { background-color: ${DARK.surface} !important; }
</style>
<!--[if mso]>
<style>body, table, td, p, a, h1 { font-family: "Segoe UI", "Microsoft YaHei", Arial, sans-serif !important; }</style>
<![endif]-->
</head>
<body class="canvas" style="${style({ margin: "0", padding: "0", "background-color": LIGHT.canvas })}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(intro)}</div>
<table role="presentation" class="canvas" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${LIGHT.canvas}" style="${style({ width: "100%", "background-color": LIGHT.canvas })}">
<tr><td class="page" align="center" style="${style({ padding: "40px 16px 48px" })}">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${style({ width: "100%", "max-width": "560px" })}">
<tr><td class="fg wordmark" style="${style({ ...text, padding: "0 41px 16px", "font-size": "15px", "line-height": "20px", "font-weight": "600", "letter-spacing": "-0.01em", color: LIGHT.fg })}">${escapeHtml(copy.wordmark)}</td></tr>
<tr><td class="card" bgcolor="${LIGHT.surface}" style="${style({ padding: "40px", "background-color": LIGHT.surface, border: `1px solid ${LIGHT.border}`, "border-radius": "10px" })}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td>
<h1 class="fg" style="${style({ ...text, margin: "0", "font-size": "24px", "line-height": "31px", "font-weight": "600", "letter-spacing": "-0.01em", color: LIGHT.fg })}">${escapeHtml(heading)}</h1>
<p class="fg" style="${style({ ...text, margin: "8px 0 0", "font-size": "16px", "line-height": "24px", color: LIGHT.fg })}">${escapeHtml(intro)}</p>
</td></tr>
${renderActionRows(content, copy.copyLink)}
<tr><td style="padding-top:32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="rule" style="${style({ "border-top": `1px solid ${LIGHT.border}`, "padding-top": "24px" })}">
${notes.map((note, index) => `<p class="muted" style="${style({ ...text, margin: index === 0 ? "0" : "8px 0 0", "font-size": "14px", "line-height": "21px", color: LIGHT.fgMuted })}">${escapeHtml(note)}</p>`).join("\n")}
</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`;
}
