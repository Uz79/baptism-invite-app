import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const tokensDir = path.join(repoRoot, "designs/tokens");
const outFile = path.join(repoRoot, "packages/tokens/dist/tokens.css");
const typographyOutFile = path.join(repoRoot, "packages/tokens/dist/typography.css");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const GENERATED_BANNER = `/* AUTO-GENERATED — do not edit.
 * Source: designs/tokens/* → scripts/generate-tokens-css.mjs
 * Regenerate: npm run tokens:build (from repo root)
 */

`;

const brand = readJson(path.join(tokensDir, "brand.json"));
const alias = readJson(path.join(tokensDir, "alias.json"));
const light = readJson(path.join(tokensDir, "mapped/light.json"));
const dark = readJson(path.join(tokensDir, "mapped/dark.json"));
const mobile = readJson(path.join(tokensDir, "responsive/mobile.json"));
const desktop = readJson(path.join(tokensDir, "responsive/desktop.json"));

const pxToRem = (px) =>
  `${(Number(px) / 16)
    .toFixed(4)
    .replace(/\.0+$/, "")
    .replace(/0+$/, "")}rem`;

function get(obj, p) {
  return p.split(".").reduce((acc, k) => acc?.[k], obj);
}

function tokenValue(t) {
  return t?.value;
}

/** Follow {path.to.token} refs through brand → alias until a leaf value is reached. */
function resolveTokenString(value) {
  if (typeof value !== "string") return value;
  let v = value;
  for (let i = 0; i < 40; i += 1) {
    const m = v.match(/^\{(.+)\}$/);
    if (!m) return v;
    const ref = m[1];
    const next =
      tokenValue(get(brand, ref)) ?? tokenValue(get(alias, ref)) ?? null;
    if (next == null || next === v) return v;
    v = typeof next === "string" ? next : String(next);
  }
  return v;
}

function spaceRem(n) {
  const px = resolveTokenString(tokenValue(get(alias, `space.${n}`)));
  return pxToRem(px);
}

function radiusRem(key) {
  const px = resolveTokenString(tokenValue(get(alias, `radius.${key}`)));
  return pxToRem(px);
}

function fontFamily() {
  return tokenValue(get(brand, "font-family.grotesk")) || "system-ui";
}

function fontWeight(key) {
  const raw = resolveTokenString(tokenValue(get(brand, `font-weight.${key}`)));
  const r = String(raw || "").toLowerCase();
  if (r.includes("bold")) return 700;
  if (r.includes("medium")) return 500;
  return 400;
}

function fontMetrics() {
  const m = get(brand, "font-metrics.profile-pro");
  return {
    unitsPerEm: Number(resolveTokenString(tokenValue(m?.["units-per-em"]))),
    capHeight: Number(resolveTokenString(tokenValue(m?.["cap-height"]))),
    typoAscender: Number(resolveTokenString(tokenValue(m?.["typo-ascender"]))),
    typoDescender: Number(resolveTokenString(tokenValue(m?.["typo-descender"]))),
  };
}

/** Figma leading trim: cap height → alphabetic baseline within a line box. */
function leadingTrimPx(fontSize, lineHeight, metrics) {
  const fs = Number(fontSize);
  const lh = Number(lineHeight);
  if (!metrics.unitsPerEm || !fs || !lh) {
    return { trimTop: 0, trimBottom: 0 };
  }
  const scale = fs / metrics.unitsPerEm;
  const capPx = metrics.capHeight * scale;
  const ascPx = metrics.typoAscender * scale;
  const descPx = metrics.typoDescender * scale;
  const lineBox = fs * lh;
  const halfLeading = (lineBox - fs) / 2;
  return {
    trimTop: halfLeading + (ascPx - capPx),
    trimBottom: halfLeading + descPx,
  };
}

function trimPx(value) {
  return `${Number(value).toFixed(3).replace(/\.?0+$/, "")}px`;
}

/** Figma often omits leadingTrim — default on (engineering; required for trim stacks). */
function isLeadingTrimEnabled(node) {
  const v = node?.leadingTrim?.value;
  if (v === false || v === "false") return false;
  return true;
}

function fontWeightKey(node) {
  const raw = resolveTokenString(tokenValue(node?.fontWeight));
  const r = String(raw || "").toLowerCase();
  if (r.includes("bold")) return "bold";
  if (r.includes("medium")) return "medium";
  return "regular";
}

function styleTypography(node, metrics) {
  const fs = node.fontSize.value;
  const lh = node.lineHeight.value;
  const { trimTop, trimBottom } = leadingTrimPx(fs, lh, metrics);
  return {
    fontSize: fs,
    lineHeight: lh,
    paragraphSpacing: node.paragraphSpacing?.value,
    trimTop,
    trimBottom,
    leadingTrim: isLeadingTrimEnabled(node),
    fontWeightKey: fontWeightKey(node),
  };
}

function typographyVars(src, metrics) {
  const t = src.typography;
  const hero = styleTypography(t.hero, metrics);
  const h1 = styleTypography(t.h1, metrics);
  const h2 = styleTypography(t.h2, metrics);
  const h3 = styleTypography(t.h3, metrics);
  const h4 = styleTypography(t.h4, metrics);
  const h5 = styleTypography(t.h5, metrics);
  const h6 = styleTypography(t.h6, metrics);
  const textLg = styleTypography(t.paragraph.lg, metrics);
  const textMd = styleTypography(t.paragraph.md, metrics);
  const textSm = styleTypography(t.paragraph.sm, metrics);
  const textXs = styleTypography(t.paragraph["x-sm"], metrics);
  const caption = styleTypography(t.caption, metrics);

  return {
    hero,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    textLg,
    textMd,
    textSm,
    textXs,
    caption,
    lhHero: hero.lineHeight,
    lhH1: h1.lineHeight,
    lhH2: h2.lineHeight,
    lhH3: h3.lineHeight,
    lhH4: h4.lineHeight,
    lhH5: h5.lineHeight,
    lhH6: h6.lineHeight,
    lhText: textMd.lineHeight,
    lhCaption: caption.lineHeight,
  };
}

function typographyTrimCss(vars) {
  const entries = [
    ["hero", vars.hero],
    ["h1", vars.h1],
    ["h2", vars.h2],
    ["h3", vars.h3],
    ["h4", vars.h4],
    ["h5", vars.h5],
    ["h6", vars.h6],
    ["text-lg", vars.textLg],
    ["text-md", vars.textMd],
    ["text-sm", vars.textSm],
    ["text-xs", vars.textXs],
    ["caption", vars.caption],
  ];

  return entries
    .map(
      ([name, style]) => `  --trim-top-${name}: ${trimPx(style.trimTop)};
  --trim-bottom-${name}: ${trimPx(style.trimBottom)};
  --ps-${name}: ${pxToRem(style.paragraphSpacing)};`
    )
    .join("\n");
}

function typographySizeCss(vars, breakpoint) {
  if (breakpoint === "mobile") {
    return `  --fs-hero: ${pxToRem(vars.hero.fontSize)};
  --fs-h1: ${pxToRem(vars.h1.fontSize)};
  --fs-h2: ${pxToRem(vars.h2.fontSize)};
  --fs-h3: ${pxToRem(vars.h3.fontSize)};
  --fs-h4: ${pxToRem(vars.h4.fontSize)};
  --fs-h5: ${pxToRem(vars.h5.fontSize)};
  --fs-h6: ${pxToRem(vars.h6.fontSize)};
  --fs-text-lg: ${pxToRem(vars.textLg.fontSize)};
  --fs-text-md: ${pxToRem(vars.textMd.fontSize)};
  --fs-text-sm: ${pxToRem(vars.textSm.fontSize)};
  --fs-text-xs: ${pxToRem(vars.textXs.fontSize)};
  --fs-caption: ${pxToRem(vars.caption.fontSize)};`;
  }

  return `  --fs-hero: ${pxToRem(vars.hero.fontSize)};
  --fs-h1: ${pxToRem(vars.h1.fontSize)};
  --fs-h2: ${pxToRem(vars.h2.fontSize)};
  --fs-h3: ${pxToRem(vars.h3.fontSize)};
  --fs-h4: ${pxToRem(vars.h4.fontSize)};
  --fs-h5: ${pxToRem(vars.h5.fontSize)};
  --fs-h6: ${pxToRem(vars.h6.fontSize)};
  --fs-text-lg: ${pxToRem(vars.textLg.fontSize)};`;
}

const TYPE_STYLE_DEFS = [
  { className: "hero", key: "hero", fsVar: "--fs-hero", lhVar: "--lh-hero", trimKey: "hero" },
  { className: "h1", key: "h1", fsVar: "--fs-h1", lhVar: "--lh-h1", trimKey: "h1" },
  { className: "h2", key: "h2", fsVar: "--fs-h2", lhVar: "--lh-h2", trimKey: "h2" },
  { className: "h3", key: "h3", fsVar: "--fs-h3", lhVar: "--lh-h3", trimKey: "h3" },
  { className: "h4", key: "h4", fsVar: "--fs-h4", lhVar: "--lh-h4", trimKey: "h4" },
  { className: "h5", key: "h5", fsVar: "--fs-h5", lhVar: "--lh-h5", trimKey: "h5" },
  { className: "h6", key: "h6", fsVar: "--fs-h6", lhVar: "--lh-h6", trimKey: "h6" },
  {
    className: "lg",
    key: "textLg",
    fsVar: "--fs-text-lg",
    lhVar: "--lh-text",
    trimKey: "text-lg",
  },
  {
    className: "md",
    key: "textMd",
    fsVar: "--fs-text-md",
    lhVar: "--lh-text",
    trimKey: "text-md",
  },
  {
    className: "sm",
    key: "textSm",
    fsVar: "--fs-text-sm",
    lhVar: "--lh-text",
    trimKey: "text-sm",
  },
  {
    className: "xs",
    key: "textXs",
    fsVar: "--fs-text-xs",
    lhVar: "--lh-text",
    trimKey: "text-xs",
  },
  {
    className: "caption",
    key: "caption",
    fsVar: "--fs-caption",
    lhVar: "--lh-caption",
    trimKey: "caption",
  },
];

function typographyClassesCss(vars) {
  const typeRules = TYPE_STYLE_DEFS.map(({ className, key, fsVar, lhVar, trimKey }) => {
    const style = vars[key];
    const trimVars =
      style.leadingTrim
        ? `\n  --text-trim-top: var(--trim-top-${trimKey});\n  --text-trim-bottom: var(--trim-bottom-${trimKey});`
        : "";
    return `.type-${className} {
  font-family: var(--font-family);
  font-size: var(${fsVar});
  font-weight: var(--fw-${style.fontWeightKey});
  line-height: var(${lhVar});${trimVars}
}`;
  }).join("\n\n");

  const trimStyles = TYPE_STYLE_DEFS.filter(({ key }) => vars[key].leadingTrim)
    .map(({ className }) => `.type-${className}.type-trim`)
    .join(",\n");

  const trimStylesBlock = trimStyles
    ? `${trimStyles} {
  display: block;
  margin-block-start: calc(-1 * var(--text-trim-top));
  margin-block-end: calc(-1 * var(--text-trim-bottom));
}`
    : "";

  return `${GENERATED_BANNER}/* Bundled semantic text styles */

${typeRules}

.type-medium {
  font-weight: var(--fw-medium);
}

.type-bold {
  font-weight: var(--fw-bold);
}

/* Leading trim — apply with .type-trim on styles where leadingTrim is true in tokens */
.type-trim {
  display: block;
  margin-block-start: calc(-1 * var(--text-trim-top, 0px));
  margin-block-end: calc(-1 * var(--text-trim-bottom, 0px));
}

${trimStylesBlock ? `\n${trimStylesBlock}\n` : ""}
/* Stacked trimmed lines — .type-stack-tight + .type-trim; row gap via trim-aware margins */
.type-stack-tight {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.type-stack-tight > .type-sm.type-trim:first-child {
  margin-block-end: 0;
}

.type-stack-tight > .type-sm.type-trim + .type-xs.type-trim {
  margin-block-start: calc(
    var(--text-row-gap) - var(--trim-bottom-text-sm) - var(--trim-top-text-xs)
  );
}

/* Horizontal amount pairs — never block-level trim margins */
.list-item__amount .type-trim,
.list-item__currency.type-trim,
.list-item__value.type-trim,
.list-item--group-account .list-item__end .type-trim {
  display: inline;
  margin-block: 0;
}

/* Margin-based trim only — text-box-trim caused inconsistent stack/row layout in modals and carousels. */
`;
}

/** Read mapped color token by path e.g. 'background.background', 'border.border-secondary'. */
function mappedColor(map, dottedPath) {
  const keys = dottedPath.split(".");
  let node = map;
  for (const k of keys) node = node?.[k];
  return resolveTokenString(node?.value);
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/** Dialog scrim — always mixed from `--color-overlay-tint` (foreground in both themes). */
function overlayScrimColor(isLight) {
  return `color-mix(in srgb, var(--color-overlay-tint) ${isLight ? "45%" : "62%"}, transparent)`;
}

function themeBlock(map, mode) {
  const isLight = mode === "light";
  const bg = mappedColor(map, "background.background");
  const bgSecondary = mappedColor(map, "background.background-secondary");
  const fg = mappedColor(map, "foreground.foreground");
  const fgSecondary = mappedColor(map, "foreground.foreground-secondary");
  const fgLabel = mappedColor(map, "foreground.foreground-hover");
  const fgDisabled = mappedColor(map, "foreground.foreground-disabled");
  const separator = mappedColor(map, "foreground.foreground-separator");
  const borderSecondary = mappedColor(map, "border.border-secondary");
  const borderPrimary = mappedColor(map, "border.border");

  const btnPrimaryBg = mappedColor(map, "button.primary.background");
  const btnPrimaryFg = mappedColor(map, "button.primary.foreground");
  const btnPrimaryHover = mappedColor(map, "button.primary.background-hover");
  const btnPrimaryPressed = isLight
    ? resolveTokenString("{color.primary.800}")
    : resolveTokenString("{color.primary.100}");

  const btnSecondaryBg = mappedColor(map, "button.secondary.background");
  const btnSecondaryBorder = mappedColor(map, "button.secondary.border");
  const btnSecondaryFg = mappedColor(map, "button.secondary.foreground");
  const btnSecondaryHover = mappedColor(map, "button.secondary.background-hover");
  const btnSecondaryPressed = isLight
    ? resolveTokenString("{color.primary.1000-20pc}")
    : resolveTokenString("{color.neutral.white-20pc}");

  const btnTonalBg = bgSecondary;
  const btnTonalBorder = bgSecondary;
  const btnTonalFg = fg;
  const btnTonalHover = isLight
    ? resolveTokenString("{color.primary.100}")
    : resolveTokenString("{color.primary.600}");
  const btnTonalPressed = isLight
    ? resolveTokenString("{color.primary.200}")
    : resolveTokenString("{color.primary.800}");

  const navItemActiveBg = isLight
    ? "var(--color-bg-secondary)"
    : resolveTokenString("{color.neutral.white-10pc}");
  const showAllBg = isLight
    ? separator
    : resolveTokenString("{color.neutral.white-10pc}");
  const iconCircleFill = isLight ? "var(--color-fg)" : resolveTokenString("{color.neutral.white}");

  const overlayScrim = overlayScrimColor(isLight);
  const navElevatedShadow = isLight
    ? "rgba(0, 0, 0, 0.06)"
    : "rgba(0, 0, 0, 0.35)";
  const modalElevatedShadow = isLight
    ? "rgba(0, 0, 0, 0.12)"
    : "rgba(0, 0, 0, 0.45)";

  const actionCircleHover = isLight
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 21, 126, 0.1)";
  const actionCirclePressed = isLight
    ? "rgba(255, 255, 255, 0.22)"
    : "rgba(0, 21, 126, 0.2)";

  const inputStrokeFocus = isLight ? "var(--color-fg)" : borderPrimary;

  const segmentedTrack = isLight
    ? 'rgba(0, 21, 126, 0.05)'
    : 'rgba(255, 255, 255, 0.08)';

  const bgSidebar = isLight ? bg : "var(--color-bg)";

  return `  color-scheme: ${isLight ? "light" : "dark"};

  --color-bg: ${bg};
  --color-bg-secondary: ${bgSecondary};
  --color-bg-sidebar: ${bgSidebar};
  --color-nav-item-active-bg: ${navItemActiveBg};
  --color-show-all-bg: ${showAllBg};
  --color-segmented-track-bg: ${segmentedTrack};
  --color-fg: ${fg};
  --color-fg-secondary: ${fgSecondary};
  --color-fg-label: ${fgLabel};
  --color-fg-disabled: ${fgDisabled};
  --color-separator: ${separator};

  --color-btn-primary-bg: ${btnPrimaryBg};
  --color-btn-primary-fg: ${btnPrimaryFg};
  --color-btn-primary-hover: ${btnPrimaryHover};
  --color-btn-primary-pressed: ${btnPrimaryPressed};

  --color-btn-secondary-bg: ${btnSecondaryBg};
  --color-btn-secondary-border: ${btnSecondaryBorder};
  --color-btn-secondary-fg: ${btnSecondaryFg};
  --color-btn-secondary-hover: ${btnSecondaryHover};
  --color-btn-secondary-pressed: ${btnSecondaryPressed};

  --color-btn-tonal-bg: ${btnTonalBg};
  --color-btn-tonal-border: ${btnTonalBorder};
  --color-btn-tonal-fg: ${btnTonalFg};
  --color-btn-tonal-hover: ${btnTonalHover};
  --color-btn-tonal-pressed: ${btnTonalPressed};

  --color-icon-circle-fill: ${iconCircleFill};
  --color-overlay-scrim: ${overlayScrim};
  --color-nav-elevated-shadow: ${navElevatedShadow};
  --color-modal-elevated-shadow: ${modalElevatedShadow};

  --color-surface-state-hover: var(--color-btn-secondary-hover);
  --color-surface-state-pressed: var(--color-btn-secondary-pressed);

  --color-action-circle-state-hover: ${actionCircleHover};
  --color-action-circle-state-pressed: ${actionCirclePressed};

  --color-input-surface: var(--color-bg);
  --color-input-stroke: ${borderSecondary};
  --color-input-stroke-focus: ${inputStrokeFocus};
`;
}

/** Fail fast when a Figma re-import would silently break list-row typography. */
function assertTypographyPipeline(metrics, mob) {
  const errors = [];
  const { unitsPerEm, capHeight, typoAscender, typoDescender } = metrics;

  if (!unitsPerEm || !capHeight || !typoAscender || !typoDescender) {
    errors.push(
      "brand.font-metrics.profile-pro is missing or incomplete — need units-per-em, cap-height, typo-ascender, typo-descender in brand.json."
    );
  }

  for (const [label, style] of [
    ["text-sm", mob.textSm],
    ["text-xs", mob.textXs],
  ]) {
    if (!style.trimTop || !style.trimBottom) {
      errors.push(
        `Leading trim for ${label} computed to 0 — font-metrics or responsive typography may be broken after the Figma export.`
      );
    }
  }

  if (Number(mob.textMd.fontSize) !== 16) {
    errors.push(
      `paragraph.md must be 16px on mobile (got ${mob.textMd.fontSize}px) — accessibility base size.`
    );
  }

  if (errors.length) {
    console.error("tokens:build validation failed:\n");
    for (const msg of errors) console.error(`  • ${msg}`);
    console.error(
      "\nFix designs/tokens/*.json, then re-run npm run tokens:build."
    );
    console.error(
      "Do not hand-edit packages/tokens/dist/*.css.\n"
    );
    process.exit(1);
  }
}

const metrics = fontMetrics();
const mob = typographyVars(mobile, metrics);
const desk = typographyVars(desktop, metrics);

assertTypographyPipeline(metrics, mob);

const css = `${GENERATED_BANNER}@font-face {
  font-family: 'Profile Pro';
  src: url('../fonts/ProfilePro-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Profile Pro';
  src: url('../fonts/ProfilePro-Medium.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Profile Pro';
  src: url('../fonts/ProfilePro-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Generated from designs/tokens/* — theme: <html data-theme="light|dark"> */
:root {
  --space-1: ${spaceRem(1)};
  --space-2: ${spaceRem(2)};
  --space-3: ${spaceRem(3)};
  --space-4: ${spaceRem(4)};
  --space-5: ${spaceRem(5)};
  --space-6: ${spaceRem(6)};
  --space-7: ${spaceRem(7)};
  --space-8: ${spaceRem(8)};
  --space-9: ${spaceRem(9)};
  --space-10: ${spaceRem(10)};
  --space-11: ${spaceRem(11)};
  --space-12: ${spaceRem(12)};

  --radius-small: ${radiusRem("small")};
  --radius-regular: ${radiusRem("regular")};
  --radius-pill: ${radiusRem("pill")};

  --font-family: '${fontFamily()}', sans-serif;
  --fw-regular: ${fontWeight("regular")};
  --fw-medium: ${fontWeight("medium")};
  --fw-bold: ${fontWeight("bold")};

${typographySizeCss(mob, "mobile")}

  --lh-hero: ${mob.lhHero};
  --lh-h1: ${mob.lhH1};
  --lh-h2: ${mob.lhH2};
  --lh-h3: ${mob.lhH3};
  --lh-h4: ${mob.lhH4};
  --lh-h5: ${mob.lhH5};
  --lh-h6: ${mob.lhH6};
  --lh-text: ${mob.lhText};
  --lh-caption: ${mob.lhCaption};

  /* Leading trim — Profile Pro cap → baseline (computed from brand font-metrics) */
${typographyTrimCss(mob)}

  /* Tight row gap for stacked trimmed labels — fixed 8dp (immune to space-scale shifts) */
  --text-row-gap: 0.5rem;

  --btn-pad-y-sm: 0;
  --btn-pad-x-sm: var(--space-2);
  --btn-pad-y-md: var(--space-2);
  --btn-pad-x-md: var(--space-3);
  --btn-pad-y-lg: var(--space-4);
  --btn-pad-x-lg: var(--space-5);
  --btn-height-sm: 2rem;

  --input-stroke-px: 1px;
  --input-stroke-focus-px: 2px;
  --input-stroke-width: 1px;
}

/* Theme colors live in colors.css (v4 mapped) + compat.css — not emitted here. */

@media (min-width: 1280px) {
  :root {
${typographySizeCss(desk, "desktop")}

    --lh-hero: ${desk.lhHero};
    --lh-h1: ${desk.lhH1};
    --lh-h2: ${desk.lhH2};
    --lh-h3: ${desk.lhH3};
    --lh-h4: ${desk.lhH4};
    --lh-h5: ${desk.lhH5};
    --lh-h6: ${desk.lhH6};
    --lh-text: ${desk.lhText};
    --lh-caption: ${desk.lhCaption};

${typographyTrimCss(desk)}
  }
}
`;

fs.writeFileSync(outFile, css, "utf8");
fs.writeFileSync(typographyOutFile, typographyClassesCss(mob), "utf8");
console.log(`Wrote ${outFile}`);
console.log(`Wrote ${typographyOutFile}`);
console.log(`  --trim-top-text-sm: ${trimPx(mob.textSm.trimTop)}`);
console.log(`  --text-row-gap: 0.5rem`);
