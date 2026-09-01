/**
 * Coarse times-of-day, in minutes past midnight, so word-labels sort alongside
 * concrete "HH:MM" times. "备选" (an optional alternative, not a real time)
 * sorts to the very end.
 */
const WORD_MINUTES: Record<string, number> = {
  凌晨: 4 * 60,
  清晨: 5 * 60 + 30,
  一早: 6 * 60,
  清早: 6 * 60,
  早上: 7 * 60,
  早晨: 7 * 60,
  上午: 9 * 60,
  白天: 10 * 60,
  中午: 12 * 60,
  午后: 13 * 60 + 30,
  下午: 14 * 60,
  傍晚: 18 * 60,
  黄昏: 18 * 60 + 30,
  入夜: 19 * 60 + 30,
  晚上: 20 * 60,
  夜里: 22 * 60,
  深夜: 23 * 60,
  备选: 30 * 60,
};

const NUMERIC_TIME = /^(\d{1,2}):(\d{2})$/;

/**
 * Turn a schedule label into minutes past midnight for ordering. Concrete
 * "HH:MM" times parse directly; coarse words map to a representative time;
 * anything unrecognised sorts last (kept stable by the caller's sort).
 */
export function parseTimeToMinutes(time: string): number {
  const match = NUMERIC_TIME.exec(time.trim());
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  return WORD_MINUTES[time.trim()] ?? Number.MAX_SAFE_INTEGER;
}
