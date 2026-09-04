/** Colour math + token derivation for custom BG/FG themes (banking contrast-checker port). */

export type ThemeMode = "light" | "dark";

export type ThemeKind = "monochrome" | "multicolor";

/** Full seed ramp length (primary picker + internal neutral reference). */
export const SEQUENCE_STEPS = 13;

/** Background finetune ramp length in the Theme modal. */
export const FINETUNE_BG_STEPS = 7;

/** Foreground finetune ramp length — full 0–1200 scale (13 steps). */
export const FINETUNE_FG_STEPS = SEQUENCE_STEPS;

/** @deprecated Use FINETUNE_BG_STEPS or FINETUNE_FG_STEPS. */
export const FINETUNE_STEPS = FINETUNE_BG_STEPS;

/** Background finetune labels — 50 increments from 0 through 300. */
export const FINETUNE_BG_STEP_LABELS = [0, 50, 100, 150, 200, 250, 300] as const;

/** Foreground finetune labels — 0 through 1200 (13 steps, one label per chip). */
export const FINETUNE_FG_STEP_LABELS = [
  0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200,
] as const;

/** @deprecated Use FINETUNE_BG_STEP_LABELS or FINETUNE_FG_STEP_LABELS. */
export const FINETUNE_STEP_LABELS = FINETUNE_BG_STEP_LABELS;

/** Token step names for the full primary ramp (50–1200). */
export const NEUTRAL_STEP_LABELS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
] as const;

/** Index of the 300 step on the full ramp — background cap colour. */
export const NEUTRAL_300_STEP_INDEX = NEUTRAL_STEP_LABELS.indexOf(300);

const LEGACY_FINETUNE_LEN = 13;

export type ShellContrast = {
  bgIndex: number;
  fgIndex: number;
};

export type ThemeSettings = {
  kind: ThemeKind;
  neutralSeed: string;
  primarySeed: string;
  bgIndex: number;
  fgIndex: number;
  /** Selected step on the primary seed ramp (multicolor only). */
  primaryIndex: number;
};

export type ColorPair = {
  /** Page / canvas background */
  bg: string;
  /** Primary / interactive accent (Theme flow “Primary color”) */
  fg: string;
  /** Neutral body ink (Theme flow “Neutral color”); falls back to canonical body */
  neutral?: string;
  /** v2 theme-flow: sequence indices + seeds (persisted with override). */
  kind?: ThemeKind;
  neutralSeed?: string;
  primarySeed?: string;
  bgIndex?: number;
  fgIndex?: number;
  primaryIndex?: number;
  /** Per-shell foreground/background ramp indices (Light and Dark differ). */
  contrastByShell?: Partial<Record<ThemeMode, ShellContrast>>;
  /** Per-shell primary ramp index (multicolor — Light/Dark need different steps). */
  primaryByShell?: Partial<Record<ThemeMode, number>>;
};

export type SavedTheme = ColorPair & {
  id: string;
  name: string;
  createdAt: number;
};

export const DEFAULT_NEUTRAL_SEED = "#3b3d42";
export const DEFAULT_PRIMARY_SEED = "#00157e";

export const OVERRIDE_KEY = "uzMapsColorOverride_v11";
export const THEMES_KEY = "uzMapsSavedColorThemes_v04";

export const CANONICAL: Record<ThemeMode, ColorPair> = {
  /* Theme-flow pair: bg + interactive accent. Body ink stays neutral via deriveTokens. */
  light: {
    bg: "#ffffff",
    fg: "#1c2f8c",
    kind: "multicolor",
    primarySeed: "#1c2f8c",
  },
  dark: {
    bg: "#080a10",
    fg: "#c6cbe2",
    kind: "multicolor",
    primarySeed: "#c6cbe2",
  },
};

/** Neutral body ink (Figma foreground/foreground) — not the Theme-flow accent. */
export const CANONICAL_BODY_FG: Record<ThemeMode, string> = {
  light: "#3a3d42",
  dark: "#f2f2f3",
};

const WCAG = { AA_LARGE: 3, AAA_LARGE: 4.5, AA_NORMAL: 4.5, AAA_NORMAL: 7 };

export type WcagChecks = {
  aaLarge: boolean;
  aaaLarge: boolean;
  aaNormal: boolean;
  aaaNormal: boolean;
};

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

const DERIVED_NAMES = [
  /* Legacy --color-* aliases (app shell + theme flow) */
  "color-bg",
  "color-bg-secondary",
  "color-bg-sidebar",
  "color-fg",
  "color-fg-interactive",
  "color-fg-secondary",
  "color-fg-label",
  "color-fg-disabled",
  "color-separator",
  "color-show-all-bg",
  "color-nav-item-active-bg",
  "color-segmented-track-bg",
  "color-input-stroke",
  "color-input-stroke-focus",
  "color-input-surface",
  "color-icon-circle-fill",
  "color-btn-primary-bg",
  "color-btn-primary-fg",
  "color-btn-primary-hover",
  "color-btn-primary-pressed",
  "color-btn-secondary-bg",
  "color-btn-secondary-border",
  "color-btn-secondary-fg",
  "color-btn-secondary-hover",
  "color-btn-secondary-pressed",
  "color-btn-tonal-bg",
  "color-btn-tonal-border",
  "color-btn-tonal-fg",
  "color-btn-tonal-hover",
  "color-btn-tonal-pressed",
  "color-overlay-tint",
  "color-nav-elevated-shadow",
  "color-modal-elevated-shadow",
  "color-surface-state-hover",
  "color-surface-state-pressed",
  "color-action-circle-state-hover",
  "color-action-circle-state-pressed",
  /* v4 semantic tokens consumed by @cartography-lab/ui buttons, segmented, chips */
  "background-background",
  "background-background-brand",
  "foreground-foreground",
  "foreground-foreground-interactive",
  "foreground-foreground-link",
  "border-border-focus",
  "button-primary-background",
  "button-primary-border",
  "button-primary-foreground",
  "button-primary-state-hover",
  "button-primary-state-pressed",
  "button-primary-state-focus",
  "button-secondary-border",
  "button-secondary-background",
  "button-secondary-foreground",
  "button-secondary-state-hover",
  "button-secondary-state-pressed",
  "button-tonal-background",
  "button-tonal-border",
  "button-tonal-foreground",
  "button-tonal-state-hover",
  "button-tonal-state-pressed",
  "segmented-background",
  "segmented-background-selected",
  "segmented-foreground",
  "segmented-foreground-selected",
  "chip-background",
  "chip-background-selected",
  "chip-border",
  "chip-border-selected",
  "chip-foreground",
  "chip-foreground-selected",
  "chip-state-hover",
  "chip-state-hover-selected",
  "chip-state-pressed",
  "chip-state-pressed-selected",
  "chip-foreground-disabled",
  "nav-item-background-selected",
  "nav-item-foreground",
  "nav-item-foreground-selected",
  "field-border-focus",
  "field-border-hover",
  "field-border",
  "field-background",
  "field-foreground",
  "slider-thumb",
  "slider-thumb-border",
  "slider-track",
  "slider-track-active",
  "slider-track-disabled",
  "panel-border",
  "panel-background",
  "button-tonal-state-focus",
  "button-tonal-background-disabled",
  "button-tonal-border-disabled",
  "button-tonal-foreground-disabled",
  "button-icon-only-background-tonal",
  "button-icon-only-foreground",
  "button-icon-only-state-hover",
  "button-icon-only-state-pressed",
  "toggle-switch-background",
  "toggle-switch-background-active",
  "toggle-switch-border",
  "toggle-switch-label",
  "toggle-switch-thumb",
  "toggle-switch-thumb-inactive",
  /* Panel + field copy — Neutral ink (not Primary) */
  "panel-foreground",
  "panel-foreground-secondary",
  "field-label",
  "field-label-secondary",
  "foreground-foreground-secondary",
  /* Map surfaces — Neutral seed tints land / “true to size” */
  "map-background",
  "map-graticule",
  "map-label",
  "map-land-0-background",
  "map-land-0-border",
  "map-land-0-state-hover",
  "map-land-0-state-pressed",
  "map-distortion-by-region-distortion-1",
  "map-distortion-by-region-distortion-2",
  "map-distortion-by-region-distortion-3",
  "map-distortion-by-region-distortion-4",
  "map-distortion-by-region-distortion-5",
] as const;

/** Canonical map greys — keep relative luminance when retinting from Neutral. */
const MAP_LAND_0_CANONICAL = { light: "#e5e6e7", dark: "#505257" } as const;
const MAP_BG_CANONICAL = { light: "#f2f2f3", dark: "#17191f" } as const;
/** DS muted label / hint luminance targets for Neutral ramp picks. */

/** Pick ramp step whose luminance is closest to a canonical grey. */
function pickRampByLuminance(ramp: string[], targetHex: string): string {
  const target = hexToRgb(targetHex);
  if (!target || ramp.length === 0) return ramp[0] ?? targetHex;
  const targetL = relLuminance(target);
  let best = ramp[0];
  let bestDist = Infinity;
  for (const step of ramp) {
    const rgb = hexToRgb(step);
    if (!rgb) continue;
    const dist = Math.abs(relLuminance(rgb) - targetL);
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export type Hsv = { h: number; s: number; v: number };

/** HSV for the 2D saturation/value pad (not interchangeable with HSL s/l). */
export function rgbToHsv(r: number, g: number, b: number): Hsv {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  const s = max === 0 ? 0 : d / max;
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(max * 100),
  };
}

export function hsvToRgb(h: number, s: number, v: number): Rgb {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  v = Math.min(100, Math.max(0, v)) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function relLuminance(rgb: Rgb): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return 1;
  const L1 = relLuminance(a);
  const L2 = relLuminance(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

function hexesEqual(a: string, b: string): boolean {
  const na = normalizeHex(a);
  const nb = normalizeHex(b);
  return na != null && nb != null && na === nb;
}

/**
 * Ink on filled / inverted controls. Uses the selected frame background colour
 * unless it is the same as the fill; only then tries alternate ramp picks.
 * Does not auto-swap for WCAG contrast — theme flow owns that choice.
 */
export function pickInvertedInk(
  fillHex: string,
  preferredBackgroundHex: string,
  fallbacks: string[] = []
): string {
  const fill = normalizeHex(fillHex);
  const preferred = normalizeHex(preferredBackgroundHex);
  if (!fill) return preferred ?? fallbacks[0] ?? "#ffffff";

  if (preferred && !hexesEqual(fill, preferred)) {
    return preferred;
  }

  for (const candidate of fallbacks) {
    const normalized = normalizeHex(candidate);
    if (normalized && !hexesEqual(fill, normalized)) {
      return normalized;
    }
  }

  return contrastOnSwatch(fillHex).ink;
}

export function normalizeHex(raw: string): string | null {
  let hex = raw.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return hex.length === 6 && /^[a-f\d]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : null;
}

/** 8-digit hex (#RRGGBBAA) matching ds4 token format. */
export function hexAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g
    .toString(16)
    .padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}${a}`;
}

export function shellThemeFromPair(bgHex: string, fgHex: string): ThemeMode {
  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);
  if (!bg || !fg) return "dark";
  return relLuminance(bg) < relLuminance(fg) ? "dark" : "light";
}

export function wcagFromRatio(ratio: number): WcagChecks {
  return {
    aaLarge: ratio >= WCAG.AA_LARGE,
    aaaLarge: ratio >= WCAG.AAA_LARGE,
    aaNormal: ratio >= WCAG.AA_NORMAL,
    aaaNormal: ratio >= WCAG.AAA_NORMAL,
  };
}

const SEED_RAMP_LIGHTNESS = [98, 96, 90, 82, 72, 62, 52, 44, 36, 28, 22, 14, 6] as const;

/**
 * 13-step seed ramp (light → dark) for Theme flow swatches.
 * Keeps hue/sat of the seed; varies lightness.
 */
export function buildSeedRamp(hex: string, steps = SEQUENCE_STEPS): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return Array.from({ length: steps }, () => "#cccccc");
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lights = SEED_RAMP_LIGHTNESS;
  return lights.slice(0, steps).map((l) => {
    const out = hslToRgb(h, Math.min(100, s), l);
    return rgbToHex(out.r, out.g, out.b);
  });
}

/** Map a seed colour to its best-matching step on its own ramp (by lightness band). */
export function findPrimarySeedIndex(seedHex: string, sequence?: string[]): number {
  const rgb = hexToRgb(seedHex);
  if (!rgb) return 0;
  const { l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lights = SEED_RAMP_LIGHTNESS;
  const len = sequence?.length ?? lights.length;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < len; i += 1) {
    const targetL = lights[i] ?? lights[lights.length - 1];
    const dist = Math.abs(targetL - l);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return Math.max(0, Math.min(len - 1, best));
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const mixed = mixRgb(a, b, t);
  return rgbToHex(mixed.r, mixed.g, mixed.b);
}

/** Monochrome foreground ramp — full 50–1200 sequence from the neutral seed. */
export function buildForegroundSequence(neutralSeed: string): string[] {
  return buildSeedRamp(neutralSeed, FINETUNE_FG_STEPS);
}

function darkForegroundLabelIndex(chipIndex: number): number {
  if (FINETUNE_FG_STEPS <= 1) return 0;
  return Math.round((chipIndex / (FINETUNE_FG_STEPS - 1)) * NEUTRAL_300_STEP_INDEX);
}

function migrateFinetuneBgIndex(index: number, fromLen = LEGACY_FINETUNE_LEN): number {
  if (fromLen <= 1) return clampSequenceIndex(index, FINETUNE_BG_STEPS);
  const t = index / (fromLen - 1);
  return clampSequenceIndex(Math.round(t * (FINETUNE_BG_STEPS - 1)), FINETUNE_BG_STEPS);
}

/** Expand foreground indices wrongly stored on the 7-step finetune scale (v10). */
function migrateFinetuneFgIndexFromShortRamp(index: number, shortLen = FINETUNE_BG_STEPS): number {
  if (shortLen <= 1) return clampSequenceIndex(index, FINETUNE_FG_STEPS);
  const t = index / (shortLen - 1);
  return clampSequenceIndex(Math.round(t * (FINETUNE_FG_STEPS - 1)), FINETUNE_FG_STEPS);
}

function migrateFinetunePair(
  pair: ColorPair,
  opts?: { expandForegroundFrom7?: boolean }
): ColorPair {
  let changed = false;

  let bgIndex = pair.bgIndex;
  let fgIndex = pair.fgIndex;
  if (bgIndex != null && bgIndex >= FINETUNE_BG_STEPS) {
    bgIndex = migrateFinetuneBgIndex(bgIndex);
    changed = true;
  }
  if (opts?.expandForegroundFrom7 && fgIndex != null && fgIndex <= FINETUNE_BG_STEPS - 1) {
    fgIndex = migrateFinetuneFgIndexFromShortRamp(fgIndex);
    changed = true;
  }

  let contrastByShell = pair.contrastByShell;
  if (contrastByShell) {
    const next: Partial<Record<ThemeMode, ShellContrast>> = {};
    for (const shell of ["light", "dark"] as const) {
      const stored = contrastByShell[shell];
      if (!stored) continue;
      const nextBg =
        stored.bgIndex >= FINETUNE_BG_STEPS
          ? migrateFinetuneBgIndex(stored.bgIndex)
          : stored.bgIndex;
      let nextFg = stored.fgIndex;
      if (opts?.expandForegroundFrom7 && nextFg <= FINETUNE_BG_STEPS - 1) {
        nextFg = migrateFinetuneFgIndexFromShortRamp(nextFg);
      }
      if (nextBg !== stored.bgIndex || nextFg !== stored.fgIndex) changed = true;
      next[shell] = {
        bgIndex: clampSequenceIndex(nextBg, FINETUNE_BG_STEPS),
        fgIndex: clampSequenceIndex(nextFg, FINETUNE_FG_STEPS),
      };
    }
    contrastByShell = next;
  }

  if (!changed) return pair;
  return {
    ...pair,
    ...(bgIndex != null ? { bgIndex: clampSequenceIndex(bgIndex, FINETUNE_BG_STEPS) } : {}),
    ...(fgIndex != null ? { fgIndex: clampSequenceIndex(fgIndex, FINETUNE_FG_STEPS) } : {}),
    ...(contrastByShell ? { contrastByShell } : {}),
  };
}

/** Canvas floor for dark-shell background ramp (matches canonical page bg). */
const CANVAS_FLOOR_DARK = "#080a10";

/**
 * Light shell background ramp — white → foreground-300 (7 finetune steps).
 */
export function buildBackgroundSequence(foregroundSequence: string[]): string[] {
  const cap =
    foregroundSequence[NEUTRAL_300_STEP_INDEX] ??
    foregroundSequence[foregroundSequence.length - 1] ??
    "#cbccce";
  const white = "#ffffff";
  const steps = FINETUNE_BG_STEPS;
  return Array.from({ length: steps }, (_, i) => {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    return mixHex(white, cap, t);
  });
}

/** Dark shell background ramp — canvas → lighter dark (7 finetune steps). */
function buildDarkBackgroundSequence(fullRamp: string[]): string[] {
  const cap = fullRamp[9] ?? fullRamp[fullRamp.length - 2] ?? "#505257";
  const steps = FINETUNE_BG_STEPS;
  return Array.from({ length: steps }, (_, i) => {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    return mixHex(CANVAS_FLOOR_DARK, cap, t);
  });
}

/** Dark shell foreground ramp — compressed light band (13 finetune steps). */
function buildDarkForegroundSequence(fullRamp: string[]): string[] {
  const light = fullRamp[0] ?? "#f2f2f3";
  const cap = fullRamp[NEUTRAL_300_STEP_INDEX] ?? fullRamp[3] ?? light;
  const steps = FINETUNE_FG_STEPS;
  return Array.from({ length: steps }, (_, i) => {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    return mixHex(light, cap, t);
  });
}

export function canonicalNeutralIndices(shell: ThemeMode): { bgIndex: number; fgIndex: number } {
  if (shell === "dark") {
    return { bgIndex: 0, fgIndex: NEUTRAL_300_STEP_INDEX };
  }
  return { bgIndex: 0, fgIndex: 9 };
}

export function formatNeutralTokenLabel(
  index: number,
  row: "background" | "foreground",
  shell: ThemeMode = "light"
): string {
  if (row === "foreground") {
    if (shell === "dark") {
      const step = NEUTRAL_STEP_LABELS[darkForegroundLabelIndex(index)];
      return step != null ? `neutral-${step}` : `neutral-${index}`;
    }
    const clamped = clampSequenceIndex(index, FINETUNE_FG_STEP_LABELS.length);
    const step = FINETUNE_FG_STEP_LABELS[clamped];
    return `neutral-${step}`;
  }
  const clamped = clampSequenceIndex(index, FINETUNE_BG_STEP_LABELS.length);
  const step = FINETUNE_BG_STEP_LABELS[clamped];
  if (shell === "light" && step === 0) {
    return "neutral-0 (white)";
  }
  return `neutral-${step}`;
}

export type MonochromeSequences = {
  foreground: string[];
  background: string[];
};

export function buildMonochromeSequences(
  neutralSeed: string,
  shell: ThemeMode = "light"
): MonochromeSequences {
  const fullRamp = buildForegroundSequence(neutralSeed);
  if (shell === "dark") {
    return {
      foreground: buildDarkForegroundSequence(fullRamp),
      background: buildDarkBackgroundSequence(fullRamp),
    };
  }
  return {
    foreground: fullRamp,
    background: buildBackgroundSequence(fullRamp),
  };
}

export function buildNeutralSequence(neutralSeed: string): string[] {
  return buildForegroundSequence(neutralSeed);
}

/** Primary accent ramp — 13-step seed ramp from the primary seed. */
export function buildPrimarySequence(primarySeed: string): string[] {
  return buildSeedRamp(primarySeed, SEQUENCE_STEPS);
}

export function formatPrimaryTokenLabel(index: number): string {
  const step = NEUTRAL_STEP_LABELS[index];
  return step != null ? `primary-${step}` : `primary-${index}`;
}

export function clampSequenceIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, Math.round(index)));
}

/** Map DS step label (50–1200) to a colour on a 13-step seed ramp. */
function colorFromPaletteStep(ramp: string[], stepLabel: number): string {
  const idx = NEUTRAL_STEP_LABELS.indexOf(stepLabel as (typeof NEUTRAL_STEP_LABELS)[number]);
  if (idx >= 0 && ramp[idx]) return ramp[idx]!;
  const t = stepLabel / 1200;
  return ramp[clampSequenceIndex(Math.round(t * (ramp.length - 1)), ramp.length)] ?? ramp[0]!;
}

/** Distortion-by-region: ramp step + hue delta from primary (cool = small, warm = big). */
const DISTORTION_BIPOLAR_ARMS: Record<
  ThemeMode,
  {
    small: [{ step: number; hue: number; satBoost: number }, { step: number; hue: number; satBoost: number }];
    big: [{ step: number; hue: number; satBoost: number }, { step: number; hue: number; satBoost: number }];
  }
> = {
  light: {
    small: [
      { step: 700, hue: -34, satBoost: 0.06 },
      { step: 500, hue: -17, satBoost: 0.03 },
    ],
    big: [
      { step: 500, hue: 17, satBoost: 0.03 },
      { step: 700, hue: 34, satBoost: 0.06 },
    ],
  },
  dark: {
    small: [
      { step: 800, hue: -34, satBoost: 0.06 },
      { step: 600, hue: -17, satBoost: 0.03 },
    ],
    big: [
      { step: 600, hue: 17, satBoost: 0.03 },
      { step: 800, hue: 34, satBoost: 0.06 },
    ],
  },
};

/** Monochrome: neutral ramp steps only (no hue split). */
const DISTORTION_NEUTRAL_ARMS: Record<
  ThemeMode,
  { small: [number, number]; big: [number, number] }
> = {
  light: { small: [700, 500], big: [300, 200] },
  dark: { small: [800, 600], big: [1100, 1200] },
};

function shiftHueHex(hex: string, degrees: number, satBoost = 0): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const shifted = hslToRgb((h + degrees + 360) % 360, Math.min(100, s * (1 + satBoost)), l);
  return rgbToHex(shifted.r, shifted.g, shifted.b);
}

function buildDistortionByRegionTokens(
  paletteRamp: string[],
  trueToSizeHex: string,
  shell: ThemeMode,
  bipolarHueFromPrimary: boolean
): Record<string, string> {
  const pickStep = (step: number) => colorFromPaletteStep(paletteRamp, step);

  if (!bipolarHueFromPrimary) {
    const { small, big } = DISTORTION_NEUTRAL_ARMS[shell];
    return {
      "map-distortion-by-region-distortion-1": pickStep(small[0]),
      "map-distortion-by-region-distortion-2": pickStep(small[1]),
      "map-distortion-by-region-distortion-3": trueToSizeHex,
      "map-distortion-by-region-distortion-4": pickStep(big[0]),
      "map-distortion-by-region-distortion-5": pickStep(big[1]),
    };
  }

  const { small, big } = DISTORTION_BIPOLAR_ARMS[shell];
  const pickArm = (step: number, hue: number, satBoost: number) =>
    shiftHueHex(pickStep(step), hue, satBoost);

  return {
    "map-distortion-by-region-distortion-1": pickArm(small[0].step, small[0].hue, small[0].satBoost),
    "map-distortion-by-region-distortion-2": pickArm(small[1].step, small[1].hue, small[1].satBoost),
    "map-distortion-by-region-distortion-3": trueToSizeHex,
    "map-distortion-by-region-distortion-4": pickArm(big[0].step, big[0].hue, big[0].satBoost),
    "map-distortion-by-region-distortion-5": pickArm(big[1].step, big[1].hue, big[1].satBoost),
  };
}

/** Minimum contrast between selected background + foreground ramp swatches. */
const MIN_RAMP_CONTRAST = 3;

const PRIMARY_INK_ON_LIGHT = "#ffffff";

/** Map ramp index across Light/Dark shells (ramps run opposite semantic directions). */
export function mapContrastIndexAcrossShells(
  fromIndex: number,
  fromLen: number,
  toLen: number,
  fromShell: ThemeMode,
  toShell: ThemeMode
): number {
  if (toLen <= 1) return 0;
  if (fromLen <= 1) return clampSequenceIndex(fromIndex, toLen);
  if (fromShell === toShell) return clampSequenceIndex(fromIndex, toLen);
  const t = fromIndex / (fromLen - 1);
  return clampSequenceIndex(Math.round((1 - t) * (toLen - 1)), toLen);
}

/** @deprecated Use mapContrastIndexAcrossShells when crossing shells. */
export function mapIndexByRelativePosition(
  fromIndex: number,
  fromLen: number,
  toLen: number
): number {
  if (toLen <= 1) return 0;
  if (fromLen <= 1) return clampSequenceIndex(fromIndex, toLen);
  const t = fromIndex / (fromLen - 1);
  return clampSequenceIndex(Math.round(t * (toLen - 1)), toLen);
}

function ensureReadableShellContrast(
  bgIndex: number,
  fgIndex: number,
  sequences: MonochromeSequences,
  shell: ThemeMode
): ShellContrast {
  const bg = sequences.background[bgIndex];
  const fg = sequences.foreground[fgIndex];
  if (bg && fg && contrastRatio(bg, fg) >= MIN_RAMP_CONTRAST) {
    return { bgIndex, fgIndex };
  }
  const defaults = canonicalNeutralIndices(shell);
  return {
    bgIndex: clampSequenceIndex(defaults.bgIndex, sequences.background.length),
    fgIndex: clampSequenceIndex(defaults.fgIndex, sequences.foreground.length),
  };
}

/** Ink on primary-filled controls — prefers frame bg, falls back to WCAG-safe ink. */
function inkOnPrimaryFill(
  fillHex: string,
  pageBgHex: string,
  neutralFgHex: string
): string {
  const preferred = pickInvertedInk(fillHex, pageBgHex, [pageBgHex, neutralFgHex]);
  if (contrastRatio(fillHex, preferred) >= MIN_RAMP_CONTRAST) return preferred;
  return contrastOnSwatch(fillHex).ink;
}

/** Ink for multicolor primary fills (set circle, buttons, segments). */
export function inkOnPrimaryControl(
  fillHex: string,
  pageBgHex: string,
  neutralFgHex: string,
  shell: ThemeMode
): string {
  if (shell === "light") {
    if (contrastRatio(fillHex, PRIMARY_INK_ON_LIGHT) >= MIN_RAMP_CONTRAST) {
      return PRIMARY_INK_ON_LIGHT;
    }
    return contrastOnSwatch(fillHex).ink;
  }
  return inkOnPrimaryFill(fillHex, pageBgHex, neutralFgHex);
}

/** Map primary ramp index across shells — same step = same colour on the shared ramp. */
export function mapPrimaryIndexAcrossShells(
  fromIndex: number,
  _fromLen: number,
  toLen: number,
  _fromShell: ThemeMode,
  _toShell: ThemeMode
): number {
  return clampSequenceIndex(fromIndex, toLen);
}

/** Ink used when scoring primary fills (strict — matches label ink on controls). */
function primaryControlInkForReport(
  fillHex: string,
  shell: ThemeMode,
  pageBgHex: string,
  neutralFgHex: string
): string {
  if (shell === "light") {
    return PRIMARY_INK_ON_LIGHT;
  }
  return inkOnPrimaryFill(fillHex, pageBgHex, neutralFgHex);
}

/** Ink used on primary-filled controls for accessibility scoring. */
function primaryInkForShell(
  fillHex: string,
  shell: ThemeMode,
  pageBgHex: string,
  neutralFgHex: string
): string {
  if (shell === "light") {
    if (contrastRatio(fillHex, PRIMARY_INK_ON_LIGHT) >= MIN_RAMP_CONTRAST) {
      return PRIMARY_INK_ON_LIGHT;
    }
    return contrastOnSwatch(fillHex).ink;
  }
  return inkOnPrimaryFill(fillHex, pageBgHex, neutralFgHex);
}

function primaryStepContrastStrict(
  index: number,
  primarySequence: string[],
  pageBgHex: string,
  neutralFgHex: string,
  shell: ThemeMode
): number {
  const fill = primarySequence[index];
  if (!fill) return 0;
  const ink = primaryControlInkForReport(fill, shell, pageBgHex, neutralFgHex);
  return contrastRatio(fill, ink);
}

function recommendPrimaryIndex(
  requestedIndex: number,
  primarySequence: string[],
  pageBgHex: string,
  neutralFgHex: string,
  shell: ThemeMode
): number {
  if (primarySequence.length === 0) return 0;
  const score = (idx: number) =>
    primaryStepContrastStrict(idx, primarySequence, pageBgHex, neutralFgHex, shell);

  const preferred = clampSequenceIndex(requestedIndex, primarySequence.length);
  if (score(preferred) >= MIN_RAMP_CONTRAST) return preferred;

  if (shell === "light") {
    for (let i = primarySequence.length - 1; i >= 0; i -= 1) {
      if (score(i) >= MIN_RAMP_CONTRAST) return i;
    }
  } else {
    for (let i = 0; i < primarySequence.length; i += 1) {
      if (score(i) >= MIN_RAMP_CONTRAST) return i;
    }
  }

  let maxIdx = 0;
  let maxScore = 0;
  for (let i = 0; i < primarySequence.length; i += 1) {
    const s = score(i);
    if (s > maxScore) {
      maxScore = s;
      maxIdx = i;
    }
  }
  return maxIdx;
}

/** Pick a primary ramp step with readable ink on filled controls (multicolor). */
export function ensureAccessiblePrimaryIndex(
  primaryIndex: number,
  primarySequence: string[],
  pageBgHex: string,
  neutralFgHex: string,
  kind: ThemeKind = "multicolor",
  shell: ThemeMode = "light"
): number {
  if (kind !== "multicolor" || primarySequence.length === 0) {
    return clampSequenceIndex(primaryIndex, primarySequence.length);
  }

  const score = (idx: number) => {
    const fill = primarySequence[idx];
    if (!fill) return 0;
    return primaryStepContrastStrict(idx, primarySequence, pageBgHex, neutralFgHex, shell);
  };

  let preferred = clampSequenceIndex(primaryIndex, primarySequence.length);

  if (score(preferred) >= MIN_RAMP_CONTRAST) return preferred;

  if (shell === "light") {
    for (let i = primarySequence.length - 1; i >= 0; i -= 1) {
      if (score(i) >= MIN_RAMP_CONTRAST) return i;
    }
  } else {
    for (let i = 0; i < primarySequence.length; i += 1) {
      if (score(i) >= MIN_RAMP_CONTRAST) return i;
    }
    for (let i = primarySequence.length - 1; i >= 0; i -= 1) {
      if (score(i) >= MIN_RAMP_CONTRAST) return i;
    }
  }

  let maxIdx = 0;
  let maxScore = 0;
  for (let i = 0; i < primarySequence.length; i += 1) {
    const s = score(i);
    if (s > maxScore) {
      maxScore = s;
      maxIdx = i;
    }
  }
  return maxIdx;
}

export type PrimaryShellStatus = "ok" | "adapted" | "warn" | "blocked";

export type PrimaryShellReport = {
  shell: ThemeMode;
  status: PrimaryShellStatus;
  requestedIndex: number;
  effectiveIndex: number;
  contrastRatio: number;
  requestedLabel: string;
  effectiveLabel: string;
  hint: string;
};

export type PrimaryAccessibilityReport = {
  light: PrimaryShellReport;
  dark: PrimaryShellReport;
  seedBlocked: boolean;
  blockMessage: string | null;
};

function primaryStepContrast(
  index: number,
  primarySequence: string[],
  pageBgHex: string,
  neutralFgHex: string,
  shell: ThemeMode
): number {
  return primaryStepContrastStrict(
    index,
    primarySequence,
    pageBgHex,
    neutralFgHex,
    shell
  );
}

function shellHasAccessiblePrimaryStep(
  primarySequence: string[],
  pageBgHex: string,
  neutralFgHex: string,
  shell: ThemeMode
): boolean {
  for (let i = 0; i < primarySequence.length; i += 1) {
    if (
      primaryStepContrastStrict(i, primarySequence, pageBgHex, neutralFgHex, shell) >=
      MIN_RAMP_CONTRAST
    ) {
      return true;
    }
  }
  return false;
}

function shellContrastForReport(
  shell: ThemeMode,
  activeShell: ThemeMode,
  settings: ThemeSettings,
  stored?: Pick<ColorPair, "contrastByShell">
): ShellContrast {
  const sequences = buildMonochromeSequences(settings.neutralSeed, shell);
  const storedContrast = stored?.contrastByShell?.[shell];
  if (storedContrast) {
    return {
      bgIndex: clampSequenceIndex(storedContrast.bgIndex, sequences.background.length),
      fgIndex: clampSequenceIndex(storedContrast.fgIndex, sequences.foreground.length),
    };
  }
  if (shell === activeShell) {
    return {
      bgIndex: clampSequenceIndex(settings.bgIndex, sequences.background.length),
      fgIndex: clampSequenceIndex(settings.fgIndex, sequences.foreground.length),
    };
  }
  const defaults = canonicalNeutralIndices(shell);
  return {
    bgIndex: clampSequenceIndex(defaults.bgIndex, sequences.background.length),
    fgIndex: clampSequenceIndex(defaults.fgIndex, sequences.foreground.length),
  };
}

function resolveRequestedPrimaryIndex(
  shell: ThemeMode,
  activeShell: ThemeMode,
  settings: ThemeSettings,
  primarySequence: string[],
  stored?: Pick<ColorPair, "primaryByShell">
): number {
  const storedIndex = stored?.primaryByShell?.[shell];
  if (storedIndex != null) {
    return clampSequenceIndex(storedIndex, primarySequence.length);
  }
  if (shell === activeShell) {
    return clampSequenceIndex(settings.primaryIndex, primarySequence.length);
  }
  const inherited =
    stored?.primaryByShell?.[activeShell] ?? settings.primaryIndex;
  return clampSequenceIndex(inherited, primarySequence.length);
}

function primaryShellHint(
  shell: ThemeMode,
  status: PrimaryShellStatus,
  requestedLabel: string,
  effectiveLabel: string,
  isActiveShell: boolean
): string {
  const shellName = shell === "light" ? "Light" : "Dark";
  switch (status) {
    case "ok":
      return "Labels readable on primary controls";
    case "adapted":
      return `${shellName} uses ${effectiveLabel} — step adjusted when switching themes`;
    case "warn":
      if (isActiveShell) {
        return `Too light for labels in ${shellName} — try ${effectiveLabel} or darker`;
      }
      return `${shellName} may need ${effectiveLabel} for readable labels when you switch`;
    case "blocked":
      return `Can't meet contrast in ${shellName} — try a different primary`;
    default:
      return "";
  }
}

function evaluatePrimaryShellReport(
  shell: ThemeMode,
  activeShell: ThemeMode,
  settings: ThemeSettings,
  stored?: Pick<ColorPair, "contrastByShell" | "primaryByShell">
): PrimaryShellReport {
  const primarySequence = buildPrimarySequence(settings.primarySeed);
  const sequences = buildMonochromeSequences(settings.neutralSeed, shell);
  const { bgIndex, fgIndex } = shellContrastForReport(shell, activeShell, settings, stored);
  const pageBgHex = sequences.background[bgIndex] ?? "#ffffff";
  const neutralFgHex = sequences.foreground[fgIndex] ?? "#3a3d42";
  const requestedIndex = resolveRequestedPrimaryIndex(
    shell,
    activeShell,
    settings,
    primarySequence,
    stored
  );
  const accessible = shellHasAccessiblePrimaryStep(
    primarySequence,
    pageBgHex,
    neutralFgHex,
    shell
  );
  const effectiveIndex = accessible
    ? recommendPrimaryIndex(
        requestedIndex,
        primarySequence,
        pageBgHex,
        neutralFgHex,
        shell
      )
    : requestedIndex;
  const contrast = primaryStepContrastStrict(
    requestedIndex,
    primarySequence,
    pageBgHex,
    neutralFgHex,
    shell
  );
  const requestedLabel = formatPrimaryTokenLabel(requestedIndex);
  const effectiveLabel = formatPrimaryTokenLabel(effectiveIndex);
  const requestedPasses = contrast >= MIN_RAMP_CONTRAST;

  let status: PrimaryShellStatus = "ok";
  if (!accessible) {
    status = "blocked";
  } else if (!requestedPasses) {
    status = "warn";
  }

  return {
    shell,
    status,
    requestedIndex,
    effectiveIndex,
    contrastRatio: contrast,
    requestedLabel,
    effectiveLabel,
    hint: primaryShellHint(shell, status, requestedLabel, effectiveLabel, shell === activeShell),
  };
}

/** Per-shell primary accessibility report (one seed, separate ramp steps). */
export function buildPrimaryAccessibilityReport(
  settings: ThemeSettings,
  activeShell: ThemeMode,
  stored?: Pick<ColorPair, "contrastByShell" | "primaryByShell">
): PrimaryAccessibilityReport | null {
  if (settings.kind !== "multicolor") return null;

  const light = evaluatePrimaryShellReport("light", activeShell, settings, stored);
  const dark = evaluatePrimaryShellReport("dark", activeShell, settings, stored);
  const blockedShell = [light, dark].find((r) => r.status === "blocked");

  return {
    light,
    dark,
    seedBlocked: Boolean(blockedShell),
    blockMessage: blockedShell ? blockedShell.hint : null,
  };
}

/** Block primary seed when no ramp step meets contrast in a shell. */
export function getPrimarySeedBlockMessage(
  primarySeed: string,
  settings: ThemeSettings,
  activeShell: ThemeMode,
  stored?: Pick<ColorPair, "contrastByShell">
): string | null {
  if (settings.kind !== "multicolor") return null;

  const draft: ThemeSettings = { ...settings, primarySeed };
  for (const shell of ["light", "dark"] as const) {
    const primarySequence = buildPrimarySequence(primarySeed);
    const sequences = buildMonochromeSequences(settings.neutralSeed, shell);
    const { bgIndex, fgIndex } = shellContrastForReport(shell, activeShell, draft, stored);
    const pageBgHex = sequences.background[bgIndex] ?? "#ffffff";
    const neutralFgHex = sequences.foreground[fgIndex] ?? "#3a3d42";
    if (
      !shellHasAccessiblePrimaryStep(primarySequence, pageBgHex, neutralFgHex, shell)
    ) {
      return shell === "light"
        ? "This hue can't meet contrast in Light; try a different primary."
        : "This hue can't meet contrast in Dark; try a different primary.";
    }
  }
  return null;
}

export function withShellThemeState(
  pair: ColorPair,
  shell: ThemeMode,
  state: { bgIndex: number; fgIndex: number; primaryIndex?: number }
): ColorPair {
  const next: ColorPair = {
    ...withShellContrast(pair, shell, state.bgIndex, state.fgIndex),
    ...(state.primaryIndex != null ? { primaryIndex: state.primaryIndex } : {}),
  };
  if (state.primaryIndex != null) {
    next.primaryByShell = {
      ...pair.primaryByShell,
      [shell]: state.primaryIndex,
    };
  }
  return next;
}

export function withShellContrast(
  pair: ColorPair,
  shell: ThemeMode,
  bgIndex: number,
  fgIndex: number
): ColorPair {
  return {
    ...pair,
    bgIndex,
    fgIndex,
    contrastByShell: {
      ...pair.contrastByShell,
      [shell]: { bgIndex, fgIndex },
    },
  };
}

function readShellPrimaryIndex(
  pair: ColorPair,
  shell: ThemeMode,
  primarySequence: string[]
): number {
  return readShellPrimaryIndexRaw(pair, shell, primarySequence);
}

function readShellPrimaryIndexRaw(
  pair: ColorPair,
  shell: ThemeMode,
  primarySequence: string[]
): number {
  const stored = pair.primaryByShell?.[shell];
  if (stored != null) return clampSequenceIndex(stored, primarySequence.length);
  if (pair.primaryIndex != null) {
    return clampSequenceIndex(pair.primaryIndex, primarySequence.length);
  }
  return findClosestSequenceIndex(primarySequence, pair.fg);
}

function parsePrimaryByShell(
  raw: unknown,
  fallbackShell: ThemeMode,
  fallback?: number
): Partial<Record<ThemeMode, number>> | undefined {
  if (!raw || typeof raw !== "object") {
    return fallback != null ? { [fallbackShell]: fallback } : undefined;
  }
  const out: Partial<Record<ThemeMode, number>> = {};
  for (const shell of ["light", "dark"] as const) {
    const value = (raw as Record<string, unknown>)[shell];
    if (Number.isFinite(value)) out[shell] = Number(value);
  }
  if (Object.keys(out).length === 0) {
    return fallback != null ? { [fallbackShell]: fallback } : undefined;
  }
  if (fallback != null && out[fallbackShell] == null) {
    out[fallbackShell] = fallback;
  }
  return out;
}

function contrastIndicesFromStored(
  stored: ShellContrast,
  sequences: MonochromeSequences,
  shell: ThemeMode
): ShellContrast {
  return ensureReadableShellContrast(
    clampSequenceIndex(stored.bgIndex, sequences.background.length),
    clampSequenceIndex(stored.fgIndex, sequences.foreground.length),
    sequences,
    shell
  );
}

function contrastIndicesForAppliedPair(
  pair: ColorPair,
  shell: ThemeMode,
  sequences: MonochromeSequences
): ShellContrast {
  let bgIndex = pair.bgIndex ?? canonicalNeutralIndices(shell).bgIndex;
  let fgIndex = pair.fgIndex ?? canonicalNeutralIndices(shell).fgIndex;

  if (pair.bg) {
    bgIndex = findClosestSequenceIndex(sequences.background, pair.bg);
  }
  if (pair.neutral) {
    fgIndex = findClosestSequenceIndex(sequences.foreground, pair.neutral);
  }

  return ensureReadableShellContrast(
    clampSequenceIndex(bgIndex, sequences.background.length),
    clampSequenceIndex(fgIndex, sequences.foreground.length),
    sequences,
    shell
  );
}

function readShellContrastIndices(
  pair: ColorPair,
  shell: ThemeMode,
  sequences: MonochromeSequences
): ShellContrast {
  const stored = pair.contrastByShell?.[shell];
  if (stored) {
    return contrastIndicesFromStored(stored, sequences, shell);
  }
  return contrastIndicesForAppliedPair(pair, shell, sequences);
}

/** Snapshot leaving-shell indices — prefer persisted per-shell memory. */
function readLeavingShellContrast(
  pair: ColorPair,
  fromShell: ThemeMode,
  sequences: MonochromeSequences
): ShellContrast {
  const stored = pair.contrastByShell?.[fromShell];
  if (stored) {
    return contrastIndicesFromStored(stored, sequences, fromShell);
  }
  return contrastIndicesForAppliedPair(pair, fromShell, sequences);
}

function parseContrastByShell(
  raw: unknown,
  fallbackShell: ThemeMode,
  fallback?: ShellContrast
): Partial<Record<ThemeMode, ShellContrast>> | undefined {
  if (!raw || typeof raw !== "object") {
    return fallback ? { [fallbackShell]: fallback } : undefined;
  }
  const out: Partial<Record<ThemeMode, ShellContrast>> = {};
  for (const shell of ["light", "dark"] as const) {
    const item = (raw as Record<string, unknown>)[shell];
    if (!item || typeof item !== "object") continue;
    const bgIndex = Number((item as Partial<ShellContrast>).bgIndex);
    const fgIndex = Number((item as Partial<ShellContrast>).fgIndex);
    if (Number.isFinite(bgIndex) && Number.isFinite(fgIndex)) {
      out[shell] = { bgIndex, fgIndex };
    }
  }
  if (Object.keys(out).length === 0) {
    return fallback ? { [fallbackShell]: fallback } : undefined;
  }
  if (fallback && !out[fallbackShell]) {
    out[fallbackShell] = fallback;
  }
  return out;
}

/** @deprecated Legacy combined sequence (primary + neutral). Neutral UI uses monochrome ramps only. */
export function buildColorSequence(
  settings: Pick<ThemeSettings, "kind" | "neutralSeed" | "primarySeed">
): string[] {
  const neutral = buildNeutralSequence(settings.neutralSeed);
  if (settings.kind === "multicolor") {
    const primary = normalizeHex(settings.primarySeed) ?? DEFAULT_PRIMARY_SEED;
    return [primary, ...neutral];
  }
  return neutral;
}

export function findClosestSequenceIndex(sequence: string[], targetHex: string): number {
  const target = hexToRgb(targetHex);
  if (!target || sequence.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  sequence.forEach((step, i) => {
    const rgb = hexToRgb(step);
    if (!rgb) return;
    const dist =
      Math.abs(rgb.r - target.r) + Math.abs(rgb.g - target.g) + Math.abs(rgb.b - target.b);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

export function findSeedIndexInSequence(sequence: string[], seedHex: string): number {
  const normalized = normalizeHex(seedHex);
  if (!normalized) return -1;
  const exact = sequence.findIndex((c) => c.toLowerCase() === normalized);
  if (exact >= 0) return exact;
  return findClosestSequenceIndex(sequence, normalized);
}

/** True when fg is a chromatic accent distinct from neutral body ink. */
function inferMulticolorPair(pair: ColorPair): boolean {
  const accent = hexToRgb(pair.fg);
  const neutral = hexToRgb(pair.neutral || pair.fg);
  if (!accent || !neutral) return false;
  if (hexesEqual(pair.fg, pair.neutral || pair.fg)) return false;

  const ah = rgbToHsl(accent.r, accent.g, accent.b);
  const nh = rgbToHsl(neutral.r, neutral.g, neutral.b);
  if (ah.s < 12 && nh.s < 12) return false;

  /* Canonical Light: blue primary + cool gray neutral share hue — use saturation contrast. */
  if (ah.s >= 25 && nh.s < 20) return true;

  /* Dark shell: near-white accent on light neutral body ink. */
  if (ah.l >= 92 && nh.l >= 88 && nh.s < 15 && ah.l - nh.l >= 3) return true;

  const hueDiff = Math.min(Math.abs(ah.h - nh.h), 360 - Math.abs(ah.h - nh.h));
  return hueDiff > 20 && ah.s > 15;
}

export function themeKindFromPair(pair: ColorPair): ThemeKind {
  if (inferMulticolorPair(pair)) return "multicolor";
  if (pair.kind === "multicolor" || pair.kind === "monochrome") return pair.kind;
  return "monochrome";
}

/** Shift indices saved when multicolor prepended primary at sequence index 0. */
function migrateLegacyMulticolorIndices(
  settings: ThemeSettings,
  shell: ThemeMode
): ThemeSettings {
  if (settings.kind !== "multicolor") return settings;

  const legacy = buildColorSequence(settings);
  const { foreground, background } = buildMonochromeSequences(settings.neutralSeed, shell);
  let { fgIndex, bgIndex } = settings;

  /* Only remap when the stored index clearly matches the old primary-prefixed combined ramp. */
  if (
    fgIndex > 0 &&
    fgIndex < legacy.length &&
    legacy[fgIndex] === foreground[fgIndex - 1]
  ) {
    fgIndex -= 1;
  }

  if (
    bgIndex > 0 &&
    bgIndex < legacy.length &&
    legacy[bgIndex] === background[bgIndex - 1]
  ) {
    bgIndex -= 1;
  }

  return {
    ...settings,
    fgIndex: clampSequenceIndex(fgIndex, foreground.length),
    bgIndex: clampSequenceIndex(bgIndex, background.length),
  };
}

export function settingsFromPair(pair: ColorPair, shell: ThemeMode): ThemeSettings {
  const neutralSeed =
    normalizeHex(pair.neutralSeed || "") ??
    normalizeHex(pair.neutral || "") ??
    normalizeHex(pair.fg) ??
    CANONICAL_BODY_FG[shell];
  const primarySeed =
    normalizeHex(pair.primarySeed || "") ?? normalizeHex(pair.fg) ?? DEFAULT_PRIMARY_SEED;
  const kind: ThemeKind = themeKindFromPair(pair);
  const primarySequence = buildPrimarySequence(primarySeed);
  const sequences = buildMonochromeSequences(neutralSeed, shell);
  const { bgIndex, fgIndex } = readShellContrastIndices(pair, shell, sequences);
  const primaryIndex = readShellPrimaryIndex(pair, shell, primarySequence);

  if (pair.neutralSeed || pair.contrastByShell?.[shell]) {
    return migrateLegacyMulticolorIndices(
      {
        kind,
        neutralSeed: pair.neutralSeed ?? neutralSeed,
        primarySeed,
        bgIndex,
        fgIndex,
        primaryIndex,
      },
      shell
    );
  }

  if (kind === "monochrome") {
    return {
      kind,
      neutralSeed,
      primarySeed,
      bgIndex: findClosestSequenceIndex(sequences.background, pair.bg),
      fgIndex: findClosestSequenceIndex(sequences.foreground, pair.neutral ?? pair.fg),
      primaryIndex: findClosestSequenceIndex(primarySequence, primarySeed),
    };
  }
  return {
    kind,
    neutralSeed,
    primarySeed,
    bgIndex: findClosestSequenceIndex(sequences.background, pair.bg),
    fgIndex: findClosestSequenceIndex(sequences.foreground, pair.neutral ?? pair.fg),
    primaryIndex: findClosestSequenceIndex(primarySequence, pair.fg),
  };
}

/** Theme-flow defaults for the Light/Dark shell (not a hard-coded monochrome preset). */
export function canonicalThemeSettings(mode: ThemeMode): ThemeSettings {
  return settingsFromPair(readCanonicalFromTheme(mode), mode);
}

export function pairFromSettings(settings: ThemeSettings, shell: ThemeMode): ColorPair {
  const neutralSeed = normalizeHex(settings.neutralSeed) ?? DEFAULT_NEUTRAL_SEED;
  const primarySeed = normalizeHex(settings.primarySeed) ?? DEFAULT_PRIMARY_SEED;

  if (settings.kind === "monochrome") {
    const { foreground, background } = buildMonochromeSequences(neutralSeed, shell);
    const bgIndex = clampSequenceIndex(settings.bgIndex, background.length);
    const fgIndex = clampSequenceIndex(settings.fgIndex, foreground.length);
    const bg = background[bgIndex];
    const fgStep = foreground[fgIndex];
    return {
      bg,
      fg: fgStep,
      neutral: fgStep,
      kind: settings.kind,
      neutralSeed,
      primarySeed,
      bgIndex,
      fgIndex,
      primaryIndex: clampSequenceIndex(
        settings.primaryIndex,
        buildPrimarySequence(primarySeed).length
      ),
    };
  }

  const { foreground, background } = buildMonochromeSequences(neutralSeed, shell);
  const primarySequence = buildPrimarySequence(primarySeed);
  const bgIndex = clampSequenceIndex(settings.bgIndex, background.length);
  const fgIndex = clampSequenceIndex(settings.fgIndex, foreground.length);
  const primaryIndex = clampSequenceIndex(settings.primaryIndex, primarySequence.length);
  const bg = background[bgIndex];
  const fgStep = foreground[fgIndex];
  const fg = primarySequence[primaryIndex] ?? primarySeed;

  return {
    bg,
    fg,
    neutral: fgStep,
    kind: settings.kind,
    neutralSeed,
    primarySeed,
    bgIndex,
    fgIndex,
    primaryIndex,
  };
}

/** Contrast of ink-on-fill for the “Aa” swatch (white or near-black). */
export function contrastOnSwatch(fillHex: string): {
  ratio: number;
  ink: string;
  checks: WcagChecks;
} {
  const white = "#ffffff";
  const black = "#080a10";
  const rWhite = contrastRatio(fillHex, white);
  const rBlack = contrastRatio(fillHex, black);
  const useWhite = rWhite >= rBlack;
  const ratio = useWhite ? rWhite : rBlack;
  return { ratio, ink: useWhite ? white : black, checks: wcagFromRatio(ratio) };
}

export function deriveTokens(
  bgHex: string,
  fgHex: string,
  neutralHex?: string,
  kind: ThemeKind = "monochrome",
  seeds?: Pick<ColorPair, "neutralSeed" | "primarySeed">
): Record<string, string> {
  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);
  if (!bg || !fg) return {};

  const isDark = relLuminance(bg) < relLuminance(fg);
  const isMulticolor = kind === "multicolor";
  const mix = (a: Rgb, b: Rgb, t: number) =>
    rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  const fgAlpha = (a: number) => `rgba(${fg.r}, ${fg.g}, ${fg.b}, ${a})`;
  const blackAlpha = (a: number) => `rgba(0, 0, 0, ${a})`;
  const white = { r: 255, g: 255, b: 255 };

  const bgElev = isDark ? 0.22 : 0.07;
  const fgElev = isDark ? 0.06 : 0.22;
  /* Primary (fg) drives interactive chrome; Neutral seed drives ink + map. */
  const accentHex = fgHex;
  const accent = fg;
  const fallbackNeutral = isDark ? CANONICAL_BODY_FG.dark : CANONICAL_BODY_FG.light;
  const neutralSeedHex =
    normalizeHex(seeds?.neutralSeed || "") ?? normalizeHex(neutralHex || "") ?? fallbackNeutral;
  const primarySeedHex = normalizeHex(seeds?.primarySeed || "") ?? accentHex;
  const neutralRgb = hexToRgb(neutralSeedHex) ?? hexToRgb(fallbackNeutral)!;
  /* Neutral tint ramp → body ink (light step in Dark) + map land / true-to-size */
  const neutralRamp = buildSeedRamp(neutralSeedHex);
  const primaryRamp = buildSeedRamp(primarySeedHex);
  const neutralFgHex = isDark
    ? pickRampByLuminance(neutralRamp, CANONICAL_BODY_FG.dark)
    : relLuminance(neutralRgb) > 0.55
      ? pickRampByLuminance(neutralRamp, CANONICAL_BODY_FG.light)
      : neutralSeedHex;
  const selectedForegroundHex = normalizeHex(neutralHex || "") ?? neutralFgHex;
  const brandPrimaryHex = isDark ? bgHex : accentHex;
  const brandPrimaryRgb = isDark ? bg : accent;
  /* Filled / inverted controls: multicolor uses primary accent; monochrome dark uses inverse white. */
  const primaryFillHex = isMulticolor ? accentHex : isDark ? "#ffffff" : accentHex;
  const primaryFillRgb = hexToRgb(primaryFillHex) ?? accent;
  const primaryFillIsDark = relLuminance(primaryFillRgb) < 0.45;
  const invertedControlInk = (fillHex: string) =>
    pickInvertedInk(fillHex, bgHex, [bgHex, neutralFgHex, accentHex]);
  const primaryControlInk = (fillHex: string) => {
    if (!isMulticolor) return invertedControlInk(fillHex);
    const shell: ThemeMode = isDark ? "dark" : "light";
    return inkOnPrimaryControl(fillHex, bgHex, selectedForegroundHex, shell);
  };
  const btnPrimaryFg = primaryControlInk(primaryFillHex);
  const invertedSelectedFillHex = isMulticolor ? accentHex : isDark ? "#ffffff" : accentHex;
  const primaryStateHover = primaryFillIsDark
    ? hexAlpha("#ffffff", 0.1)
    : hexAlpha(accentHex, 0.1);
  const primaryStatePressed = primaryFillIsDark
    ? hexAlpha("#ffffff", 0.2)
    : hexAlpha(accentHex, 0.2);
  const secondaryAccent = isDark ? accentHex : brandPrimaryHex;
  const tonalBg = mix(bg, accent, isDark ? 0.28 : 0.08);
  const tonalHover = mix(bg, accent, isDark ? 0.38 : 0.14);
  const tonalPressed = mix(bg, accent, isDark ? 0.48 : 0.22);

  const modeKey = isDark ? "dark" : "light";
  const land0Hex = pickRampByLuminance(neutralRamp, MAP_LAND_0_CANONICAL[modeKey]);
  const mapBgHex = pickRampByLuminance(neutralRamp, MAP_BG_CANONICAL[modeKey]);
  const land0Border = isDark ? mix(bg, hexToRgb(land0Hex)!, 0.35) : "#ffffff";
  const land0Hover = hexAlpha(neutralSeedHex, 0.1);
  const land0Pressed = hexAlpha(neutralSeedHex, 0.2);
  const mapLabelHex = isDark
    ? mix(hexToRgb(neutralFgHex)!, white, 0.15)
    : mix(hexToRgb(neutralFgHex)!, bg, 0.15);
  const mapGraticule = hexAlpha(neutralSeedHex, isDark ? 0.18 : 0.1);
  /* Secondary / muted ink: 70% opacity of the selected foreground swatch. */
  const secondaryFgHex = hexAlpha(selectedForegroundHex, 0.7);

  const shell: ThemeMode = isDark ? "dark" : "light";
  const distortionTokens = buildDistortionByRegionTokens(
    isMulticolor ? primaryRamp : neutralRamp,
    land0Hex,
    shell,
    isMulticolor
  );

  return {
    "color-bg": bgHex,
    "color-bg-secondary": mix(bg, accent, bgElev),
    "color-bg-sidebar": bgHex,
    "color-fg": neutralFgHex,
    "color-fg-interactive": accentHex,
    "color-fg-secondary": secondaryFgHex,
    "color-fg-label": secondaryFgHex,
    "color-fg-disabled": isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(8, 10, 16, 0.4)",
    "color-separator": fgAlpha(0.1),
    "color-show-all-bg": fgAlpha(0.1),
    "color-nav-item-active-bg": fgAlpha(0.1),
    "color-segmented-track-bg": fgAlpha(isDark ? 0.08 : 0.05),
    "color-input-stroke": fgAlpha(0.7),
    "color-input-stroke-focus": accentHex,
    "color-input-surface": bgHex,
    "color-icon-circle-fill": accentHex,
    "color-btn-primary-bg": primaryFillHex,
    "color-btn-primary-fg": btnPrimaryFg,
    "color-btn-primary-hover": mix(primaryFillRgb, bg, fgElev),
    "color-btn-primary-pressed": mix(primaryFillRgb, bg, Math.min(0.45, fgElev * 1.75)),
    "color-btn-secondary-bg": bgHex,
    "color-btn-secondary-border": secondaryAccent,
    "color-btn-secondary-fg": secondaryAccent,
    "color-btn-secondary-hover": mix(bg, accent, 0.1),
    "color-btn-secondary-pressed": mix(bg, accent, 0.2),
    "color-btn-tonal-bg": tonalBg,
    "color-btn-tonal-border": tonalBg,
    "color-btn-tonal-fg": accentHex,
    "color-btn-tonal-hover": tonalHover,
    "color-btn-tonal-pressed": tonalPressed,
    "color-overlay-tint": accentHex,
    "color-nav-elevated-shadow": blackAlpha(isDark ? 0.35 : 0.06),
    "color-modal-elevated-shadow": blackAlpha(isDark ? 0.45 : 0.12),
    "color-surface-state-hover": fgAlpha(0.1),
    "color-surface-state-pressed": fgAlpha(0.2),
    "color-action-circle-state-hover": hexAlpha(accentHex, 0.1),
    "color-action-circle-state-pressed": hexAlpha(accentHex, 0.2),
    /* v4 tokens — buttons/segmented/chips read these directly from colors.css */
    "background-background": bgHex,
    "background-background-brand": accentHex,
    "foreground-foreground": neutralFgHex,
    "foreground-foreground-interactive": accentHex,
    "foreground-foreground-link": accentHex,
    "foreground-foreground-secondary": secondaryFgHex,
    "border-border-focus": accentHex,
    "button-primary-background": primaryFillHex,
    "button-primary-border": primaryFillHex,
    "button-primary-foreground": btnPrimaryFg,
    "button-primary-state-hover": primaryStateHover,
    "button-primary-state-pressed": primaryStatePressed,
    "button-primary-state-focus": primaryStateHover,
    "button-secondary-background": bgHex,
    "button-secondary-border": secondaryAccent,
    "button-secondary-foreground": secondaryAccent,
    "button-secondary-state-hover": hexAlpha(accentHex, 0.1),
    "button-secondary-state-pressed": hexAlpha(accentHex, 0.2),
    "button-tonal-background": tonalBg,
    "button-tonal-border": tonalBg,
    "button-tonal-foreground": accentHex,
    "button-tonal-state-hover": tonalHover,
    "button-tonal-state-pressed": tonalPressed,
    "button-tonal-state-focus": hexAlpha(accentHex, 0.1),
    "button-tonal-background-disabled": hexAlpha(accentHex, isDark ? 0.05 : 0.05),
    "button-tonal-border-disabled": hexAlpha(accentHex, 0),
    "button-tonal-foreground-disabled": hexAlpha(accentHex, 0.4),
    "button-icon-only-background-tonal": tonalBg,
    "button-icon-only-foreground": accentHex,
    "button-icon-only-state-hover": hexAlpha(accentHex, 0.1),
    "button-icon-only-state-pressed": hexAlpha(accentHex, 0.2),
    "segmented-background": fgAlpha(isDark ? 0.08 : 0.05),
    "segmented-background-selected": invertedSelectedFillHex,
    "segmented-foreground": accentHex,
    "segmented-foreground-selected": primaryControlInk(invertedSelectedFillHex),
    "chip-background": isDark ? hexAlpha("#ffffff", 0.1) : hexAlpha(accentHex, 0.05),
    "chip-background-selected": invertedSelectedFillHex,
    "chip-border": hexAlpha(accentHex, 0),
    "chip-border-selected": invertedSelectedFillHex,
    "chip-foreground": accentHex,
    "chip-foreground-selected": primaryControlInk(invertedSelectedFillHex),
    "chip-state-hover": hexAlpha(accentHex, 0.1),
    "chip-state-hover-selected": hexAlpha(btnPrimaryFg, 0.1),
    "chip-state-pressed": hexAlpha(accentHex, 0.2),
    "chip-state-pressed-selected": hexAlpha(btnPrimaryFg, 0.2),
    "chip-foreground-disabled": hexAlpha(accentHex, 0.4),
    "nav-item-background-selected": fgAlpha(0.1),
    "nav-item-foreground": accentHex,
    "nav-item-foreground-selected": accentHex,
    "field-border-focus": accentHex,
    "field-border-hover": accentHex,
    "field-border": hexAlpha(accentHex, 0.7),
    "field-background": bgHex,
    "field-foreground": accentHex,
    "field-label": secondaryFgHex,
    "field-label-secondary": secondaryFgHex,
    "panel-foreground": neutralFgHex,
    "panel-foreground-secondary": secondaryFgHex,
    "panel-border": hexAlpha(isDark ? "#ffffff" : neutralSeedHex, 0.1),
    "panel-background": hexAlpha(bgHex, 0.7),
    "slider-thumb": accentHex,
    "slider-thumb-border": isDark ? accentHex : "#ffffff",
    "slider-track": isDark ? hexAlpha("#ffffff", 0.2) : hexAlpha(accentHex, 0.2),
    "slider-track-active": accentHex,
    "slider-track-disabled": hexAlpha(accentHex, 0.1),
    "toggle-switch-background": bgHex,
    "toggle-switch-background-active": accentHex,
    "toggle-switch-border": hexAlpha(accentHex, 0.7),
    "toggle-switch-label": accentHex,
    "toggle-switch-thumb": btnPrimaryFg,
    "toggle-switch-thumb-inactive": accentHex,
    /* Map — Neutral palette (land fill + true-to-size step) */
    "map-background": mapBgHex,
    "map-graticule": mapGraticule,
    "map-label": mapLabelHex,
    "map-land-0-background": land0Hex,
    "map-land-0-border": land0Border,
    "map-land-0-state-hover": land0Hover,
    "map-land-0-state-pressed": land0Pressed,
    ...distortionTokens,
  };
}

export function applyDerivedTokens(
  bgHex: string,
  fgHex: string,
  neutralHex?: string,
  kind?: ThemeKind,
  seeds?: Pick<ColorPair, "neutralSeed" | "primarySeed">
): void {
  const resolvedKind =
    kind ??
    (neutralHex
      ? themeKindFromPair({ bg: bgHex, fg: fgHex, neutral: neutralHex })
      : "monochrome");
  const derived = deriveTokens(bgHex, fgHex, neutralHex, resolvedKind, seeds);
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(derived)) {
    style.setProperty(`--${name}`, value);
  }
}

export function clearDerivedTokens(): void {
  const style = document.documentElement.style;
  for (const name of DERIVED_NAMES) {
    style.removeProperty(`--${name}`);
  }
}

export function readSavedOverride(): ColorPair | null {
  try {
    const hasV11 = localStorage.getItem(OVERRIDE_KEY);
    const raw =
      hasV11 ??
      localStorage.getItem("uzMapsColorOverride_v10") ??
      localStorage.getItem("uzMapsColorOverride_v09") ??
      localStorage.getItem("uzMapsColorOverride_v08") ??
      localStorage.getItem("uzMapsColorOverride_v07") ??
      localStorage.getItem("uzMapsColorOverride_v06") ??
      localStorage.getItem("uzMapsColorOverride_v05") ??
      localStorage.getItem("uzMapsColorOverride_v04");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ColorPair>;
    const bg = normalizeHex(parsed.bg || "");
    const fg = normalizeHex(parsed.fg || "");
    const neutral = normalizeHex(parsed.neutral || "");
    const neutralSeed = normalizeHex(String(parsed.neutralSeed || ""));
    const primarySeed = normalizeHex(String(parsed.primarySeed || ""));
    const kind = parsed.kind === "multicolor" ? "multicolor" : parsed.kind === "monochrome" ? "monochrome" : undefined;
    const bgIndex = Number.isFinite(parsed.bgIndex) ? Number(parsed.bgIndex) : undefined;
    const fgIndex = Number.isFinite(parsed.fgIndex) ? Number(parsed.fgIndex) : undefined;
    const primaryIndex = Number.isFinite(parsed.primaryIndex)
      ? Number(parsed.primaryIndex)
      : undefined;
    if (!bg || !fg) return null;
    const inferredShell = shellThemeFromPair(bg, fg);
    const contrastByShell = parseContrastByShell(
      parsed.contrastByShell,
      inferredShell,
      bgIndex != null && fgIndex != null ? { bgIndex, fgIndex } : undefined
    );
    const primaryByShell = parsePrimaryByShell(
      parsed.primaryByShell,
      inferredShell,
      primaryIndex
    );
    return migrateFinetunePair(
      {
        bg,
        fg,
        ...(neutral ? { neutral } : {}),
        ...(kind ? { kind } : {}),
        ...(neutralSeed ? { neutralSeed } : {}),
        ...(primarySeed ? { primarySeed } : {}),
        ...(bgIndex != null ? { bgIndex } : {}),
        ...(fgIndex != null ? { fgIndex } : {}),
        ...(primaryIndex != null ? { primaryIndex } : {}),
        ...(contrastByShell ? { contrastByShell } : {}),
        ...(primaryByShell ? { primaryByShell } : {}),
      },
      { expandForegroundFrom7: !hasV11 }
    );
  } catch {
    return null;
  }
}

export function saveOverride(pair: ColorPair): void {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(pair));
  } catch {
    /* ignore quota */
  }
}

export function clearSavedOverride(): void {
  try {
    localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

export function readSavedThemes(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t) => {
        const item = t as Partial<SavedTheme>;
        const bg = normalizeHex(String(item.bg || ""));
        const fg = normalizeHex(String(item.fg || ""));
        const neutral = normalizeHex(String(item.neutral || ""));
        const neutralSeed = normalizeHex(String(item.neutralSeed || ""));
        const primarySeed = normalizeHex(String(item.primarySeed || ""));
        const kind =
          item.kind === "multicolor"
            ? "multicolor"
            : item.kind === "monochrome"
              ? "monochrome"
              : undefined;
        const bgIndex = Number.isFinite(item.bgIndex) ? Number(item.bgIndex) : undefined;
        const fgIndex = Number.isFinite(item.fgIndex) ? Number(item.fgIndex) : undefined;
        if (!bg || !fg) return null;
        return {
          id: String(item.id || ""),
          name: String(item.name || "Custom"),
          bg,
          fg,
          ...(neutral ? { neutral } : {}),
          ...(kind ? { kind } : {}),
          ...(neutralSeed ? { neutralSeed } : {}),
          ...(primarySeed ? { primarySeed } : {}),
          ...(bgIndex != null ? { bgIndex } : {}),
          ...(fgIndex != null ? { fgIndex } : {}),
          createdAt: Number(item.createdAt || Date.now()),
        };
      })
      .filter((t): t is SavedTheme => Boolean(t));
  } catch {
    return [];
  }
}

export function writeSavedThemes(list: SavedTheme[]): void {
  try {
    localStorage.setItem(THEMES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** Display label for the nth palette of a kind: "Paleta A", "Paleta C", … */
export function paletteLabel(_kind: ThemeKind, index: number): string {
  return `Paleta ${index < 26 ? String.fromCharCode(65 + index) : String(index + 1)}`;
}

/**
 * Relabel a list so each palette is named by its position within its own kind.
 * Applied on every read, so palettes stored under the older "Paleta X" scheme
 * display correctly without needing a migration of the shared store.
 */
export function withDisplayNames(list: SavedTheme[]): SavedTheme[] {
  let mono = 0;
  let multi = 0;
  return list.map((p) => {
    const kind = p.kind ?? "multicolor";
    const index = kind === "monochrome" ? mono++ : multi++;
    return { ...p, name: paletteLabel(kind, index) };
  });
}

export function nextThemeName(existing: SavedTheme[], kind: ThemeKind = "multicolor"): string {
  const sameKind = existing.filter((t) => (t.kind ?? "multicolor") === kind);
  return paletteLabel(kind, sameKind.length);
}

export function makeThemeId(): string {
  return `t_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/** Read canonical pair for current data-theme without inline overrides. */
export function readCanonicalFromTheme(mode: ThemeMode): ColorPair {
  return {
    ...CANONICAL[mode],
    neutral: CANONICAL_BODY_FG[mode],
    primarySeed: CANONICAL[mode].primarySeed ?? CANONICAL[mode].fg,
  };
}

/**
 * Apply Light/Dark shell: keep seeds + per-shell contrast. Each shell remembers its
 * own fg/bg ramp indices; first visit to the other shell maps by relative position.
 */
export function applyThemeChoice(
  wantTheme: ThemeMode,
  current: ColorPair,
  fromShell: ThemeMode
): ColorPair {
  const settings = settingsFromPair(current, fromShell);
  const fromSequences = buildMonochromeSequences(settings.neutralSeed, fromShell);
  const fromContrast = readLeavingShellContrast(current, fromShell, fromSequences);

  const contrastByShell: Partial<Record<ThemeMode, ShellContrast>> = {
    ...current.contrastByShell,
    [fromShell]: fromContrast,
  };

  const { foreground, background } = buildMonochromeSequences(settings.neutralSeed, wantTheme);

  let bgIndex: number;
  let fgIndex: number;
  if (contrastByShell[wantTheme]) {
    bgIndex = clampSequenceIndex(contrastByShell[wantTheme]!.bgIndex, background.length);
    fgIndex = clampSequenceIndex(contrastByShell[wantTheme]!.fgIndex, foreground.length);
  } else {
    bgIndex = mapContrastIndexAcrossShells(
      fromContrast.bgIndex,
      fromSequences.background.length,
      background.length,
      fromShell,
      wantTheme
    );
    fgIndex = mapContrastIndexAcrossShells(
      fromContrast.fgIndex,
      fromSequences.foreground.length,
      foreground.length,
      fromShell,
      wantTheme
    );
    contrastByShell[wantTheme] = { bgIndex, fgIndex };
  }

  ({ bgIndex, fgIndex } = ensureReadableShellContrast(
    bgIndex,
    fgIndex,
    { foreground, background },
    wantTheme
  ));
  contrastByShell[wantTheme] = { bgIndex, fgIndex };

  let nextSettings: ThemeSettings = { ...settings, bgIndex, fgIndex };
  const primaryByShell: Partial<Record<ThemeMode, number>> = {
    ...current.primaryByShell,
  };

  if (settings.kind === "multicolor") {
    const primarySequence = buildPrimarySequence(settings.primarySeed);
    const pageBgHex = background[bgIndex] ?? current.bg;
    const neutralFgHex = foreground[fgIndex] ?? current.neutral ?? current.fg;
    const fromPrimary = readShellPrimaryIndexRaw(current, fromShell, primarySequence);
    primaryByShell[fromShell] = fromPrimary;

    let primaryIndex: number;
    if (primaryByShell[wantTheme] != null) {
      primaryIndex = clampSequenceIndex(primaryByShell[wantTheme]!, primarySequence.length);
    } else {
      primaryIndex = clampSequenceIndex(fromPrimary, primarySequence.length);
    }
    primaryByShell[wantTheme] = primaryIndex;
    nextSettings = { ...nextSettings, primaryIndex };
  }

  const pair: ColorPair = {
    ...withShellThemeState(pairFromSettings(nextSettings, wantTheme), wantTheme, {
      bgIndex,
      fgIndex,
      ...(settings.kind === "multicolor" ? { primaryIndex: nextSettings.primaryIndex } : {}),
    }),
    contrastByShell,
    ...(settings.kind === "multicolor" ? { primaryByShell } : {}),
  };
  saveOverride(pair);
  applyDerivedTokens(pair.bg, pair.fg, pair.neutral, pair.kind, {
    neutralSeed: pair.neutralSeed,
    primarySeed: pair.primarySeed,
  });
  document.documentElement.dataset.theme = wantTheme;
  return pair;
}

/** Boot: restore persisted override before first paint of React tree. */
export function bootColorOverride(): ColorPair | null {
  const saved = readSavedOverride();
  if (!saved) return null;
  const shell = shellThemeFromPair(saved.bg, saved.fg);
  const resolved = pairFromSettings(settingsFromPair(saved, shell), shell);
  applyDerivedTokens(resolved.bg, resolved.fg, resolved.neutral, resolved.kind, {
    neutralSeed: saved.neutralSeed ?? resolved.neutralSeed,
    primarySeed: saved.primarySeed ?? resolved.primarySeed,
  });
  document.documentElement.dataset.theme = shell;
  return { ...saved, ...resolved };
}
