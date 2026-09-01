"use strict";

const onlyStylexExports = require("./only-stylex-exports");
const requireCornerShape = require("./require-corner-shape");
const requirePackageExport = require("./require-package-export");

module.exports = {
  rules: {
    "only-stylex-exports": onlyStylexExports,
    "require-corner-shape": requireCornerShape,
    "require-package-export": requirePackageExport,
  },
};
