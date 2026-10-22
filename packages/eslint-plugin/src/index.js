"use strict";

const exportMatchesFilename = require("./conventions/export-matches-filename");
const noSingleUseLiteralAlias = require("./conventions/no-single-use-literal-alias");
const noUseClientInHooks = require("./conventions/no-use-client-in-hooks");
const onlyStylexExports = require("./design-system/only-stylex-exports");
const requireCornerShape = require("./design-system/require-corner-shape");
const requireHoverMedia = require("./design-system/require-hover-media");
const requireIconSizing = require("./design-system/require-icon-sizing");
const requireMeasure = require("./design-system/require-measure");
const requirePackageExport = require("./design-system/require-package-export");
const requirePageColumn = require("./design-system/require-page-column");
const requireRhythmSpacing = require("./design-system/require-rhythm-spacing");
const requireTextStack = require("./design-system/require-text-stack");
const requireTypeRole = require("./design-system/require-type-role");
const validStyles = require("./design-system/valid-styles.mjs").default;
const noBannedCopyWords = require("./i18n/no-banned-copy-words");
const noTOutsideRender = require("./i18n/no-t-outside-render");
const noUnnecessaryUsePrefix =
  require("./i18n/no-unnecessary-use-prefix.mjs").default;

module.exports = {
  meta: { name: "@tuja/eslint-plugin" },
  rules: {
    "export-matches-filename": exportMatchesFilename,
    "no-single-use-literal-alias": noSingleUseLiteralAlias,
    "no-use-client-in-hooks": noUseClientInHooks,
    "only-stylex-exports": onlyStylexExports,
    "require-corner-shape": requireCornerShape,
    "require-hover-media": requireHoverMedia,
    "require-icon-sizing": requireIconSizing,
    "require-measure": requireMeasure,
    "require-page-column": requirePageColumn,
    "require-package-export": requirePackageExport,
    "require-rhythm-spacing": requireRhythmSpacing,
    "require-text-stack": requireTextStack,
    "require-type-role": requireTypeRole,
    "valid-styles": validStyles,
    "no-banned-copy-words": noBannedCopyWords,
    "no-t-outside-render": noTOutsideRender,
    "no-unnecessary-use-prefix": noUnnecessaryUsePrefix,
  },
};
