/**
 * The first sentence of a JSDoc summary: up to the first `。`, or the first
 * `.` that a space and a capital follow. A stop inside a backtick code span
 * does not end it. A summary with no such stop is one sentence.
 */
export function firstSentence(summary: string) {
  const paragraph = summary.split("\n\n")[0] ?? "";
  let isCode = false;
  for (let index = 0; index < paragraph.length; index += 1) {
    const character = paragraph[index];
    if (character === "`") isCode = !isCode;
    if (isCode) continue;
    const endsChinese = character === "。";
    const endsEnglish =
      character === "." &&
      paragraph[index + 1] === " " &&
      /[A-Z]/.test(paragraph[index + 2] ?? "");
    if (endsChinese || endsEnglish) return paragraph.slice(0, index + 1);
  }
  return paragraph;
}
