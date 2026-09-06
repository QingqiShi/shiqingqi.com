import { createRequire } from "node:module";
import path from "node:path";
import * as stylex from "@stylexjs/stylex";
import {
  breakpointsFile,
  primitiveSources,
  tokensFile,
} from "./design-system-sources.mjs";

const nodeRequire = createRequire(import.meta.url);

const ROOT_FONT_SIZE_PX = 16;

function isCompiledStyleGroup(value) {
  if (typeof value !== "object" || value === null) return false;
  const members = Object.values(value);
  return (
    members.length > 0 &&
    members.every((member) => typeof member === "object" && member !== null)
  );
}

function publicMembers(group) {
  return Object.keys(group).filter((key) => !key.startsWith("__"));
}

/** Splits a CSS function's arguments on the commas that are not nested. */
function splitTopLevel(input) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts;
}

function parseLightDark(value) {
  if (typeof value !== "string") return null;
  const match = /^light-dark\((.*)\)$/s.exec(value.trim());
  if (!match) return null;
  const parts = splitTopLevel(match[1]);
  if (parts.length !== 2) return null;
  return { light: parts[0], dark: parts[1] };
}

function lengthHint(value) {
  const rem = /^(-?[\d.]+)rem$/.exec(value);
  if (rem) {
    const px = Number(rem[1]) * ROOT_FONT_SIZE_PX;
    return `${value} (${Number(px.toFixed(3))}px)`;
  }
  return value;
}

function scalarHint(value) {
  if (typeof value === "number") return String(value);
  return lengthHint(String(value));
}

function conditionLabel(condition) {
  if (condition === "default") return "";
  return condition.replace(/^@media |^@supports /, "");
}

function valueHint(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return scalarHint(value);
  return Object.entries(value)
    .map(([condition, inner]) => {
      const label = conditionLabel(condition);
      const hint = valueHint(inner);
      return label ? `${label}: ${hint}` : hint;
    })
    .join(" · ");
}

function colorRoles(member) {
  const roles = [];
  if (/^(bg|surface)/.test(member)) roles.push("background");
  if (/^text/.test(member) || /(Text|On)$/.test(member)) roles.push("text");
  if (/Border$/.test(member)) roles.push("border");
  return roles;
}

function fontRole(member) {
  if (member === "family" || member === "familyMono") return "family";
  if (member.startsWith("weight_")) return "weight";
  if (member.startsWith("lineHeight_")) return "lineHeight";
  if (member.startsWith("tracking")) return "tracking";
  return "size";
}

function varTokens(groupName, compiledGroup, authoredGroup, decorate) {
  return publicMembers(compiledGroup).map((member) => {
    const authored = authoredGroup[member];
    const entry = {
      name: `${groupName}.${member}`,
      member,
      ref: compiledGroup[member],
      hint: valueHint(authored),
    };
    return decorate ? decorate(entry, authored) : entry;
  });
}

function constTokens(groupName, group) {
  return publicMembers(group).map((member) => ({
    name: `${groupName}.${member}`,
    member,
    ref: String(group[member]),
    hint: String(group[member]),
  }));
}

function presetTokens(groupName, presets) {
  return Object.values(presets)
    .filter((preset) => preset.group === groupName)
    .map((preset) => ({
      name: preset.name,
      member: preset.member,
      className: preset.className,
      hint: preset.hint,
    }));
}

/** The state a pseudo-class inside a preset's property object stands for. */
const PSEUDO_STATES = {
  ":hover": "hover",
  ":focus-visible": "focus",
  ":focus": "focus",
  ":active": "active",
  ":disabled": "disabled",
  ":checked": "checked",
  ":indeterminate": "indeterminate",
};

const VAR_REFERENCE = /var\(--[A-Za-z0-9_-]+\)/g;

/** Every token name by the `var()` text a reference to it resolves to. */
function tokenNamesByRef(tokens) {
  const byRef = new Map();
  for (const [groupName, group] of Object.entries(tokens)) {
    if (typeof group !== "object" || group === null) continue;
    for (const member of publicMembers(group)) {
      const ref = group[member];
      if (typeof ref === "string") byRef.set(ref, `${groupName}.${member}`);
    }
  }
  return byRef;
}

/** A resolved declaration written the way a config writes it. */
function asStyleValue(value, byRef) {
  const text = String(value).replace(VAR_REFERENCE, (match) =>
    byRef.has(match) ? `{${byRef.get(match)}}` : match,
  );
  return /^\{[^{}]+\}$/.test(text) ? text.slice(1, -1) : text;
}

/**
 * The declarations a preset paints while a state is active, by state name. The
 * stand-in forces its states with attributes, so the preset's own
 * `:focus-visible` rule never matches and the playground applies these
 * instead.
 */
function presetStates(properties, byRef) {
  const states = {};
  for (const [property, value] of Object.entries(properties)) {
    if (typeof value !== "object" || value === null) continue;
    for (const [condition, branch] of Object.entries(value)) {
      const state = PSEUDO_STATES[condition];
      if (!state || branch === null || typeof branch === "object") continue;
      states[state] ??= {};
      states[state][property] = asStyleValue(branch, byRef);
    }
  }
  return states;
}

function collectPresets(loadCompiled, loadAuthored, loadResolved, byRef) {
  const presets = {};
  for (const file of primitiveSources()) {
    const compiled = loadCompiled(file);
    const authored = loadAuthored(file);
    const resolved = loadResolved(file);
    for (const [exportName, compiledGroup] of Object.entries(compiled)) {
      if (!isCompiledStyleGroup(compiledGroup)) continue;
      for (const member of publicMembers(compiledGroup)) {
        const properties = authored[exportName]?.[member] ?? {};
        const name = `${exportName}.${member}`;
        presets[name] = {
          name,
          group: exportName,
          member,
          className: stylex.props(compiledGroup[member]).className ?? "",
          source: `primitives/${path.basename(file)}`,
          properties,
          states: presetStates(resolved[exportName]?.[member] ?? {}, byRef),
          hint: Object.keys(properties).join(", "),
        };
      }
    }
  }
  return presets;
}

/**
 * The token groups the pickers offer, the presets a layer can apply, and the
 * `var()` reference behind every name. `shadow.*` is not a group, because the
 * product has no shadow control; it stays in `unlisted` so a stand-in
 * transcribed from a component that still sets one keeps resolving.
 * @returns {import("../core/types.ts").Catalogue}
 */
export function buildCatalogue({ loadCompiled, loadAuthored, loadResolved }) {
  const tokens = loadCompiled(tokensFile);
  const authoredTokens = loadAuthored(tokensFile);
  const breakpoints = loadCompiled(breakpointsFile).breakpoints;
  const motion = loadCompiled(
    nodeRequire.resolve("@tuja/ui/primitives/motion.stylex"),
  );

  const presets = collectPresets(
    loadCompiled,
    loadAuthored,
    loadResolved,
    tokenNamesByRef(tokens),
  );

  const groups = {
    color: {
      kind: "var",
      tokens: varTokens(
        "color",
        tokens.color,
        authoredTokens.color,
        (entry, authored) => {
          const pair = parseLightDark(authored);
          return {
            ...entry,
            roles: colorRoles(entry.member),
            light: pair?.light ?? String(authored),
            dark: pair?.dark ?? String(authored),
            hint: pair ? `${pair.light} / ${pair.dark}` : String(authored),
          };
        },
      ),
    },
    font: {
      kind: "var",
      tokens: varTokens("font", tokens.font, authoredTokens.font, (entry) => ({
        ...entry,
        role: fontRole(entry.member),
        scale: /^(ui|vp|cq)/.exec(entry.member)?.[1],
      })),
    },
    space: {
      kind: "var",
      tokens: varTokens("space", tokens.space, authoredTokens.space),
    },
    controlSize: {
      kind: "var",
      tokens: varTokens(
        "controlSize",
        tokens.controlSize,
        authoredTokens.controlSize,
      ),
    },
    border: {
      kind: "var",
      tokens: varTokens(
        "border",
        tokens.border,
        authoredTokens.border,
        (entry) => ({
          ...entry,
          role: entry.member.startsWith("radius") ? "radius" : "size",
        }),
      ),
    },
    layer: {
      kind: "var",
      tokens: varTokens("layer", tokens.layer, authoredTokens.layer),
    },
    opacity: {
      kind: "var",
      tokens: varTokens("opacity", tokens.opacity, authoredTokens.opacity),
    },
    ratio: {
      kind: "var",
      tokens: varTokens("ratio", tokens.ratio, authoredTokens.ratio),
    },
    breakpoints: {
      kind: "const",
      tokens: constTokens("breakpoints", breakpoints),
    },
    duration: {
      kind: "const",
      tokens: constTokens("duration", motion.duration),
    },
    easing: { kind: "const", tokens: constTokens("easing", motion.easing) },
    transition: { kind: "preset", tokens: presetTokens("transition", presets) },
    animate: { kind: "preset", tokens: presetTokens("animate", presets) },
  };

  const unlisted = Object.fromEntries(
    publicMembers(tokens.shadow).map((member) => [
      `shadow.${member}`,
      tokens.shadow[member],
    ]),
  );

  return { version: 1, groups, presets, unlisted };
}
