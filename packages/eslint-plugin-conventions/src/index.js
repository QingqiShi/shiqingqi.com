"use strict";

const exportMatchesFilename = require("./export-matches-filename");
const noUseClientInHooks = require("./no-use-client-in-hooks");

module.exports = {
  rules: {
    "export-matches-filename": exportMatchesFilename,
    "no-use-client-in-hooks": noUseClientInHooks,
  },
};
