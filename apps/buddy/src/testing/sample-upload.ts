import type { UploadBody } from "#src/server/upload/upload-body-schema.ts";

/** A valid upload body with nothing in it, to spread overrides onto. */
export function sampleUpload(overrides: Partial<UploadBody> = {}): UploadBody {
  return {
    v: 1,
    at: 1_000,
    tzOffsetMin: 0,
    firstDay: null,
    days: [],
    quota: null,
    github: null,
    merges: null,
    party: null,
    growth: { highest: null, levelUp: null },
    pet: { fed: 0, patted: 0 },
    ...overrides,
  };
}
