#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "packages/tokens/dist");
fs.mkdirSync(dist, { recursive: true });

const gen = spawnSync(process.execPath, [path.join(__dirname, "generate-tokens-css.mjs")], {
  stdio: "inherit",
  cwd: root,
});
if (gen.status !== 0) process.exit(gen.status ?? 1);

const colorsSrc = path.join(root, "designs/tokens/mapped/colors.css");
const colorsOut = path.join(dist, "colors.css");
fs.copyFileSync(colorsSrc, colorsOut);

const motion = JSON.parse(fs.readFileSync(path.join(root, "designs/tokens/motion.json"), "utf8"));
const motionCss = `/* AUTO-GENERATED from designs/tokens/motion.json — do not edit. */
:root {
  --motion-duration-instant: ${motion.duration.instant.value};
  --motion-duration-fast: ${motion.duration.fast.value};
  --motion-duration-normal: ${motion.duration.normal.value};
  --motion-duration-slow: ${motion.duration.slow.value};
  --motion-easing-standard: ${motion.easing.standard.value};
  --motion-easing-emphasized: ${motion.easing.emphasized.value};
  --motion-easing-exit: ${motion.easing.exit.value};
}
`;
fs.writeFileSync(path.join(dist, "motion.css"), motionCss);

const indexCss = `/* @cartography-lab/tokens entry — import once in apps / Storybook */
@import "./colors.css";
@import "./tokens.css";
@import "./typography.css";
@import "./motion.css";
`;
fs.writeFileSync(path.join(dist, "index.css"), indexCss);

// Compat shim: map legacy --color-* onto v4 semantic names (Light/Dark via colors.css)
const shim = `/* AUTO-GENERATED compat shim — prefer v4 names from colors.css for new work. */
html[data-theme="light"],
html[data-theme="dark"] {
  --color-bg: var(--background-background);
  --color-bg-secondary: var(--background-background-secondary);
  --color-bg-sidebar: var(--background-background);
  --color-nav-item-active-bg: var(--nav-item-background-selected);
  --color-show-all-bg: var(--button-tonal-background);
  --color-segmented-track-bg: var(--segmented-background);
  --color-fg: var(--foreground-foreground);
  --color-fg-interactive: var(--foreground-foreground-interactive);
  --color-fg-secondary: var(--foreground-foreground-secondary);
  --color-fg-label: var(--field-label);
  --color-fg-disabled: var(--foreground-foreground-disabled);
  --color-separator: var(--foreground-foreground-separator);
  --color-btn-primary-bg: var(--button-primary-background);
  --color-btn-primary-fg: var(--button-primary-foreground);
  /* Prefer overlaying --button-primary-state-hover on the primary bg (see ui.css).
   * These aliases remain for legacy call sites that expect a single color. */
  --color-btn-primary-hover: color-mix(in srgb, var(--button-primary-state-hover), var(--button-primary-background));
  --color-btn-primary-pressed: color-mix(in srgb, var(--button-primary-state-pressed), var(--button-primary-background));
  --color-btn-secondary-bg: var(--button-secondary-background);
  --color-btn-secondary-border: var(--button-secondary-border);
  --color-btn-secondary-fg: var(--button-secondary-foreground);
  --color-btn-secondary-hover: var(--button-secondary-state-hover);
  --color-btn-secondary-pressed: var(--button-secondary-state-pressed);
  --color-btn-tonal-bg: var(--button-tonal-background);
  --color-btn-tonal-border: var(--button-tonal-border);
  --color-btn-tonal-fg: var(--button-tonal-foreground);
  --color-btn-tonal-hover: var(--button-tonal-state-hover);
  --color-btn-tonal-pressed: var(--button-tonal-state-pressed);
  --color-icon-circle-fill: var(--button-icon-only-foreground);
  --color-overlay-scrim: var(--background-background-scrim);
  --color-surface-state-hover: var(--state-state-hover);
  --color-surface-state-pressed: var(--state-state-pressed);
  --color-action-circle-state-hover: var(--button-icon-only-state-hover);
  --color-action-circle-state-pressed: var(--button-icon-only-state-pressed);
  --color-input-surface: var(--field-background);
  --color-input-stroke: var(--field-border);
  --color-input-stroke-focus: var(--field-border-focus);
}
html[data-theme="light"] {
  color-scheme: light;
  --color-nav-elevated-shadow: rgba(0, 0, 0, 0.06);
  --color-modal-elevated-shadow: rgba(0, 0, 0, 0.12);
}
html[data-theme="dark"] {
  color-scheme: dark;
  --color-nav-elevated-shadow: rgba(0, 0, 0, 0.35);
  --color-modal-elevated-shadow: rgba(0, 0, 0, 0.45);
}
`;
fs.writeFileSync(path.join(dist, "compat.css"), shim);
fs.appendFileSync(path.join(dist, "index.css"), '@import "./compat.css";\n');

console.log("tokens:build → packages/tokens/dist/{index,colors,tokens,typography,motion,compat}.css");
