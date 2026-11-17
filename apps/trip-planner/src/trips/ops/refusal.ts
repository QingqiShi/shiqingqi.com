/** Why an op cannot apply, for the sender. */
export class Refusal extends Error {}

/** The first issue of a failed parse, with where it is. */
export function issueText(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  const [issue] = error.issues;
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
