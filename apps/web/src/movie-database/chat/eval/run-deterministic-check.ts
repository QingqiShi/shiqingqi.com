import type { DeterministicCheck } from "./types";

export function runDeterministicCheck(
  text: string,
  check: DeterministicCheck,
): { pass: boolean; label: string } {
  switch (check.type) {
    case "matches":
      return {
        pass: new RegExp(check.value).test(text),
        label: check.label,
      };
    case "not-matches":
      return {
        pass: !new RegExp(check.value).test(text),
        label: check.label,
      };
    case "contains":
      return {
        pass: text.includes(check.value),
        label: check.label,
      };
    case "not-contains":
      return {
        pass: !text.includes(check.value),
        label: check.label,
      };
    case "min-length":
      return {
        pass: text.length >= check.value,
        label: check.label,
      };
  }
}
