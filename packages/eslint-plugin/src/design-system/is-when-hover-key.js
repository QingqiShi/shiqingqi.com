"use strict";

const { getWhenSelector } = require("./get-when-selector");

/**
 * Whether a property's key is `stylex.when.*(selector, …)` with a static
 * selector that has `:hover`.
 * @param {import("estree").Property} property
 */
function isWhenHoverKey(property) {
  const selector = property.computed ? getWhenSelector(property.key) : null;
  return selector !== null && selector.includes(":hover");
}

module.exports = { isWhenHoverKey };
