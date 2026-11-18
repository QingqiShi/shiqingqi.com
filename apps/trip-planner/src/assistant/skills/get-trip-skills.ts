import { listTripSkills } from "./list-trip-skills.ts";
import { TRIP_SKILL_NAMES, type TripSkillName } from "./trip-skill-names.ts";

export interface TripSkill {
  name: TripSkillName;
  skillId: string;
  /** A numeric timestamp, the form a model request takes. */
  version: string;
}

const CACHE_MS = 10 * 60 * 1000;

let cached: { at: number; skills: Promise<TripSkill[]> } | null = null;

async function loadTripSkills() {
  const remote = await listTripSkills();
  const skills: TripSkill[] = [];
  for (const name of TRIP_SKILL_NAMES) {
    const skill = remote.get(name);
    if (skill) {
      skills.push({ name, skillId: skill.id, version: skill.latest_version });
    } else {
      console.warn(`Trip skill ${name} is not in the Anthropic account`);
    }
  }
  return skills;
}

/**
 * The trip skills in the Anthropic account, in a fixed order, so the model
 * request's prefix stays the same and its cache holds. One list call per
 * server instance every ten minutes; a failed call is not kept.
 */
export function getTripSkills(now = Date.now()): Promise<TripSkill[]> {
  if (cached && now - cached.at < CACHE_MS) return cached.skills;
  const entry = { at: now, skills: loadTripSkills() };
  cached = entry;
  entry.skills.catch(() => {
    if (cached === entry) cached = null;
  });
  return entry.skills;
}
