import { z } from "zod";
import {
  oldestFirst,
  skillNameOfTitle,
  type SkillFile,
  type TripSkillName,
} from "./trip-skill-names.ts";

/*
 * The AI SDK sends this API version and beta when it puts skills in a model
 * request. With them, a version is a numeric timestamp, which is the form the
 * request takes, so this file uses the same pair.
 */
const API = "https://api.anthropic.com/v1";
const HEADERS = {
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "skills-2025-10-02",
};

/** A call that hangs must not hold up a build or a turn. */
const CALL_MS = 30_000;

const remoteSkill = z.object({
  id: z.string(),
  created_at: z.string(),
  display_title: z.string().nullable(),
  latest_version: z.string(),
});
export type RemoteSkill = z.infer<typeof remoteSkill>;

const skillPage = z.object({
  data: z.array(remoteSkill),
  next_page: z.string().nullable().optional(),
});

const skillVersion = z.object({
  version: z.string(),
  description: z.string(),
});

async function call(method: string, path: string, body?: FormData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...HEADERS, "x-api-key": apiKey },
    body,
    signal: AbortSignal.timeout(CALL_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${String(response.status)}: ${text}`);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

async function listAllCustomSkills() {
  const skills: RemoteSkill[] = [];
  let page: string | null | undefined;
  do {
    const query = new URLSearchParams({ source: "custom", limit: "100" });
    if (page) query.set("page", page);
    const result = skillPage.parse(await call("GET", `/skills?${query}`));
    skills.push(...result.data);
    page = result.next_page;
  } while (page);
  return skills;
}

export async function listTripSkills() {
  const byName = new Map<TripSkillName, RemoteSkill>();
  for (const skill of oldestFirst(await listAllCustomSkills())) {
    const name = skillNameOfTitle(skill.display_title ?? "");
    if (name && !byName.has(name)) byName.set(name, skill);
  }
  return byName;
}

export async function getVersion(skillId: string, version: string) {
  return skillVersion.parse(
    await call("GET", `/skills/${skillId}/versions/${version}`),
  );
}

function filesForm(name: string, files: readonly SkillFile[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("files[]", new Blob([file.text]), `${name}/${file.path}`);
  }
  return form;
}

export async function createSkill(
  name: string,
  displayTitle: string,
  files: readonly SkillFile[],
) {
  const form = filesForm(name, files);
  form.append("display_title", displayTitle);
  return remoteSkill.parse(await call("POST", "/skills", form));
}

export async function createVersion(
  skillId: string,
  name: string,
  files: readonly SkillFile[],
) {
  return skillVersion.parse(
    await call("POST", `/skills/${skillId}/versions`, filesForm(name, files)),
  );
}
