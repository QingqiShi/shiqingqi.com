// @ts-check

const nodeFs = require("node:fs");

const defaultProjectRoot = process.cwd();

/** @type {Record<string, { _data: Record<string, string>, _mtime: number }>} */
const manifestCache = {};

/**
 * Read and cache the i18n manifest file.
 * In development, re-reads when the file's mtime changes so that
 * codegen re-runs are picked up without restarting the dev server.
 * @param {string} manifestPath
 * @returns {Record<string, string>}
 */
function readManifest(manifestPath) {
  try {
    const stat = nodeFs.statSync(manifestPath);
    const mtime = stat.mtimeMs;
    const cached = manifestCache[manifestPath];

    if (cached && cached._mtime === mtime) return cached._data;

    const content = nodeFs.readFileSync(manifestPath, "utf8");
    const data = JSON.parse(content);
    manifestCache[manifestPath] = { _data: data, _mtime: mtime };
    return data;
  } catch {
    manifestCache[manifestPath] = { _data: {}, _mtime: 0 };
    return {};
  }
}

module.exports = { defaultProjectRoot, readManifest };
