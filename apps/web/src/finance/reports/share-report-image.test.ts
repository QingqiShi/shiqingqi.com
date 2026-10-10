import { describe, expect, it } from "vitest";
import {
  canShareFiles,
  shareReportImage,
  type FileShareTarget,
} from "./share-report-image.ts";

function namedError(name: string) {
  const error = new Error(name);
  error.name = name;
  return error;
}

function setUp(target: FileShareTarget) {
  const downloads: string[] = [];
  const share = (image: Blob) =>
    shareReportImage(image, {
      fileName: "weekly-report-2026-10-04.png",
      title: "Weekly report",
      target,
      download: (_image, fileName) => {
        downloads.push(fileName);
      },
    });
  return { downloads, share };
}

const image = new Blob(["png"], { type: "image/png" });

describe("shareReportImage", () => {
  it("hands the file to the share sheet when the browser shares files", async () => {
    const shared: ShareData[] = [];
    const { downloads, share } = setUp({
      canShare: (data) => (data.files?.length ?? 0) > 0,
      share: (data) => {
        shared.push(data);
        return Promise.resolve();
      },
    });
    expect(await share(image)).toBe("shared");
    expect(shared[0].files?.[0].name).toBe("weekly-report-2026-10-04.png");
    expect(shared[0].files?.[0].type).toBe("image/png");
    expect(downloads).toEqual([]);
  });

  it("saves the file when the browser cannot share files", async () => {
    const { downloads, share } = setUp({
      canShare: () => false,
      share: () => Promise.reject(new Error("never called")),
    });
    expect(await share(image)).toBe("downloaded");
    expect(downloads).toEqual(["weekly-report-2026-10-04.png"]);
  });

  it("saves the file when the browser has no share at all", async () => {
    const { downloads, share } = setUp({});
    expect(await share(image)).toBe("downloaded");
    expect(downloads).toHaveLength(1);
  });

  it("does nothing more when the share sheet is closed", async () => {
    const { downloads, share } = setUp({
      canShare: () => true,
      share: () => Promise.reject(namedError("AbortError")),
    });
    expect(await share(image)).toBe("cancelled");
    expect(downloads).toEqual([]);
  });

  it("asks for a second tap when the tap is too old for the browser", async () => {
    const { downloads, share } = setUp({
      canShare: () => true,
      share: () => Promise.reject(namedError("NotAllowedError")),
    });
    expect(await share(image)).toBe("retry");
    expect(downloads).toEqual([]);
  });

  it("saves the file when the share fails for another reason", async () => {
    const { downloads, share } = setUp({
      canShare: () => true,
      share: () => Promise.reject(namedError("DataError")),
    });
    expect(await share(image)).toBe("downloaded");
    expect(downloads).toHaveLength(1);
  });

  it("treats a canShare that throws as no file sharing", () => {
    expect(
      canShareFiles({
        canShare: () => {
          throw new TypeError("bad data");
        },
        share: () => Promise.resolve(),
      }),
    ).toBe(false);
  });
});
