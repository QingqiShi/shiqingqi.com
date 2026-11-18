import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  createSkill,
  createVersion,
  getVersion,
  listTripSkills,
  type RemoteSkill,
} from "./list-trip-skills.ts";
import {
  contentHash,
  decideAction,
  readFrontmatter,
  skillDisplayTitle,
  TRIP_SKILL_NAMES,
  withRevision,
  type SkillFile,
  type TripSkillName,
} from "./trip-skill-names.ts";

const SKILLS_DIR = import.meta.dirname;

async function readSkillFiles(name: TripSkillName): Promise<SkillFile[]> {
  const dir = path.join(SKILLS_DIR, name);
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const full = path.join(entry.parentPath, entry.name);
        return {
          path: path.relative(dir, full).split(path.sep).join("/"),
          text: await readFile(full, "utf8"),
        };
      }),
  );
  const skillMd = files.find((file) => file.path === "SKILL.md");
  if (!skillMd) throw new Error(`${name} has no SKILL.md`);
  const { name: declared } = readFrontmatter(skillMd.text);
  if (declared !== name) {
    throw new Error(`${name}/SKILL.md declares the name ${declared}`);
  }
  return files;
}

async function checkSkillDirectories() {
  const dirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const known = new Set<string>(TRIP_SKILL_NAMES);
  const unknown = dirs.filter((dir) => !known.has(dir));
  if (unknown.length > 0) {
    throw new Error(
      `Add these skill directories to TRIP_SKILL_NAMES: ${unknown.join(", ")}`,
    );
  }
}

async function syncSkill(
  name: TripSkillName,
  remote: RemoteSkill | undefined,
): Promise<{ action: string; skillId: string; version: string }> {
  const files = await readSkillFiles(name);
  const hash = contentHash(files);
  const upload = files.map((file) =>
    file.path === "SKILL.md"
      ? { ...file, text: withRevision(file.text, hash) }
      : file,
  );

  const latestDescription = remote
    ? (await getVersion(remote.id, remote.latest_version)).description
    : null;
  const action = decideAction(
    hash,
    latestDescription === null ? null : { latestDescription },
  );

  if (action === "no change" && remote) {
    return { action, skillId: remote.id, version: remote.latest_version };
  }
  if (action === "new version" && remote) {
    const created = await createVersion(remote.id, name, upload);
    return { action, skillId: remote.id, version: created.version };
  }
  try {
    const created = await createSkill(name, skillDisplayTitle(name), upload);
    return { action, skillId: created.id, version: created.latest_version };
  } catch (error) {
    // The API refuses a second skill with the same title, so a run at the
    // same time may have made it first. Then compare against that one.
    const madeByOtherRun = (await listTripSkills()).get(name);
    if (!madeByOtherRun) throw error;
    return syncSkill(name, madeByOtherRun);
  }
}

async function main() {
  await checkSkillDirectories();
  const remote = await listTripSkills();
  for (const name of TRIP_SKILL_NAMES) {
    const result = await syncSkill(name, remote.get(name));
    console.log(
      `${name.padEnd(20)} ${result.action.padEnd(12)} ${result.skillId} ${result.version}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
