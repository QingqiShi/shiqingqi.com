import { createScorer } from "evalite";

export function containsText(
  text: string,
  { caseInsensitive = false }: { caseInsensitive?: boolean } = {},
) {
  return createScorer<unknown, string>({
    name: `Contains "${text}"`,
    description: `Checks that the output contains "${text}"${caseInsensitive ? " (case-insensitive)" : ""}`,
    scorer: ({ output }) => {
      const haystack = caseInsensitive ? output.toLowerCase() : output;
      const needle = caseInsensitive ? text.toLowerCase() : text;
      return {
        score: haystack.includes(needle) ? 1 : 0,
        metadata: {
          reason: haystack.includes(needle)
            ? `Found "${text}" in output`
            : `"${text}" not found in output`,
        },
      };
    },
  });
}

export function notContainsText(
  text: string,
  { caseInsensitive = false }: { caseInsensitive?: boolean } = {},
) {
  return createScorer<unknown, string>({
    name: `Not contains "${text}"`,
    description: `Checks that the output does not contain "${text}"${caseInsensitive ? " (case-insensitive)" : ""}`,
    scorer: ({ output }) => {
      const haystack = caseInsensitive ? output.toLowerCase() : output;
      const needle = caseInsensitive ? text.toLowerCase() : text;
      return {
        score: haystack.includes(needle) ? 0 : 1,
        metadata: {
          reason: haystack.includes(needle)
            ? `Found "${text}" in output (should not be present)`
            : `"${text}" correctly absent from output`,
        },
      };
    },
  });
}

export function matchesPattern(pattern: RegExp) {
  return createScorer<unknown, string>({
    name: `Matches ${pattern}`,
    description: `Checks that the output matches the regex pattern ${pattern}`,
    scorer: ({ output }) => {
      const matches = pattern.test(output);
      return {
        score: matches ? 1 : 0,
        metadata: {
          reason: matches
            ? `Output matches pattern ${pattern}`
            : `Output does not match pattern ${pattern}`,
        },
      };
    },
  });
}

export function minLength(chars: number) {
  return createScorer<unknown, string>({
    name: `Min length ${chars}`,
    description: `Checks that the output is at least ${chars} characters long`,
    scorer: ({ output }) => {
      const passed = output.length >= chars;
      return {
        score: passed ? 1 : 0,
        metadata: {
          reason: passed
            ? `Output length ${output.length} meets minimum ${chars}`
            : `Output length ${output.length} is below minimum ${chars}`,
        },
      };
    },
  });
}

export function maxLength(chars: number) {
  return createScorer<unknown, string>({
    name: `Max length ${chars}`,
    description: `Checks that the output is at most ${chars} characters long`,
    scorer: ({ output }) => {
      const passed = output.length <= chars;
      return {
        score: passed ? 1 : 0,
        metadata: {
          reason: passed
            ? `Output length ${output.length} is within maximum ${chars}`
            : `Output length ${output.length} exceeds maximum ${chars}`,
        },
      };
    },
  });
}
