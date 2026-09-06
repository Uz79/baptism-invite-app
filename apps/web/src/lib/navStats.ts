import { schedule } from "../data/event";

/** Straighten typographic quotes so PostHog title variants match schedule copy. */
function normalizeNavLabel(raw: string): string {
  return raw
    .trim()
    .replace(/[\u2018\u2019\u201A\u201B\u2039\u203A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .toLowerCase();
}

const TITLE_BY_KEY = Object.fromEntries(schedule.map((s) => [s.key, s.title]));

/**
 * Map a raw `stop` property (analytics key or historical display title) onto
 * the stable schedule key. Unknown values pass through unchanged.
 */
export function resolveNavStopKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (TITLE_BY_KEY[trimmed]) return trimmed;

  const norm = normalizeNavLabel(trimmed);
  for (const s of schedule) {
    if (normalizeNavLabel(s.title) === norm) return s.key;
  }

  /* Loose fallbacks for older / mistyped PostHog properties. */
  if (trimmed === "church" || /ko[sś]cie|msza/i.test(trimmed)) return "church";
  if (trimmed === "restaurant" || /restaurac|chopin/i.test(trimmed)) return "restaurant";

  return trimmed;
}

export function navStopLabel(key: string): string {
  return TITLE_BY_KEY[key] ?? key;
}

/** Collapse church/restaurant aliases into one row each (summed counts). */
export function mergeNavCounts(
  nav: Record<string, number>
): { key: string; label: string; count: number }[] {
  const merged: Record<string, number> = {};
  for (const [raw, n] of Object.entries(nav)) {
    const key = resolveNavStopKey(raw);
    merged[key] = (merged[key] ?? 0) + n;
  }

  const known = schedule
    .map((s) => ({
      key: s.key,
      label: s.title,
      count: merged[s.key] ?? 0,
    }))
    .filter((r) => r.count > 0);

  const knownKeys = new Set(schedule.map((s) => s.key));
  const extras = Object.entries(merged)
    .filter(([k, n]) => !knownKeys.has(k) && n > 0)
    .map(([key, count]) => ({ key, label: key, count }));

  return [...known, ...extras].sort((a, b) => b.count - a.count);
}
