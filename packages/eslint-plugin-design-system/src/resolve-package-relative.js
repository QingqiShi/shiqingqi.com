"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** @type {Map<string, string | null>} directory -> nearest package.json */
const packageJsonByDirectory = new Map();

/**
 * The nearest package.json above an absolute filename.
 * @param {string} filename
 * @returns {string | null}
 */
function findPackageJson(filename) {
  const start = path.dirname(filename);
  const cached = packageJsonByDirectory.get(start);
  if (cached !== undefined) return cached;

  /** @type {string | null} */
  let found = null;
  let directory = start;
  for (;;) {
    const candidate = path.join(directory, "package.json");
    if (fs.existsSync(candidate)) {
      found = candidate;
      break;
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  packageJsonByDirectory.set(start, found);
  return found;
}

/**
 * Locate a file inside its package, as the posix path relative to the package
 * root.
 * @param {string} filename
 * @returns {{ packageJsonPath: string, relative: string } | null} `null` when
 * the filename is not absolute or sits in no package.
 */
function resolvePackageRelative(filename) {
  if (!path.isAbsolute(filename)) return null;
  const packageJsonPath = findPackageJson(filename);
  if (packageJsonPath === null) return null;
  const relative = path
    .relative(path.dirname(packageJsonPath), filename)
    .split(path.sep)
    .join("/");
  return { packageJsonPath, relative };
}

module.exports = { resolvePackageRelative };
