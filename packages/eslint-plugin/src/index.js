"use strict";

const exportMatchesFilename = require("./conventions/export-matches-filename");
const noUseClientInHooks = require("./conventions/no-use-client-in-hooks");
const onlyStylexExports = require("./design-system/only-stylex-exports");
const requireCornerShape = require("./design-system/require-corner-shape");
const requirePackageExport = require("./design-system/require-package-export");
const noBannedCopyWords = require("./i18n/no-banned-copy-words");
const noTOutsideRender = require("./i18n/no-t-outside-render");

module.exports = {
  meta: { name: "@tuja/eslint-plugin" },
  rules: {
    "export-matches-filename": exportMatchesFilename,
    "no-use-client-in-hooks": noUseClientInHooks,
    "only-stylex-exports": onlyStylexExports,
    "require-corner-shape": requireCornerShape,
    "require-package-export": requirePackageExport,
    "no-banned-copy-words": noBannedCopyWords,
    "no-t-outside-render": noTOutsideRender,
  },
};
