import { describeError } from "#src/assistant/describe-error.ts";
import type { TripSkill } from "./get-trip-skills.ts";

/** How long the list of skills may take; after it, the turn goes on without skills. */
const SKILLS_MS = 5_000;

/**
 * The trip skills for a turn's container, or none when the list fails or
 * is slow: the turn then goes on without them, and tells nobody.
 */
async function load(
  list: () => Promise<readonly TripSkill[]>,
): Promise<readonly TripSkill[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      list(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("The list of skills took too long."));
        }, SKILLS_MS);
      }),
    ]);
  } catch (error) {
    console.warn("The turn runs without skills:", describeError(error));
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** The `container` option of the model request, pinned to each skill's version; nothing when there is no skill. */
function containerOption(skills: readonly TripSkill[]) {
  if (skills.length === 0) return {};
  return {
    container: {
      skills: skills.map(({ skillId, version }) => ({
        type: "custom" as const,
        providerReference: { anthropic: skillId },
        version,
      })),
    },
  };
}

/** The skills of one assistant turn. */
export const turnSkills = { load, containerOption };
