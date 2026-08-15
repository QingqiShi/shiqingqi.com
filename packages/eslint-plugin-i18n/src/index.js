"use strict";

const noBannedCopyWords = require("./no-banned-copy-words");
const noTOutsideRender = require("./no-t-outside-render");

module.exports = {
  rules: {
    "no-t-outside-render": noTOutsideRender,
    "no-banned-copy-words": noBannedCopyWords,
  },
};
