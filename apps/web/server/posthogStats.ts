import type { Stats, ThemeMode } from "./statsStore.js";

/**
 * Reads the dashboard figures out of PostHog via the Query API (HogQL).
 *
 * The personal API key is a server-only secret — it must never reach the
 * browser, which is why this runs in the API route rather than the client.
 * Needs POSTHOG_PERSONAL_API_KEY (scope query:read) and POSTHOG_PROJECT_ID.
 */

const DEFAULT_HOST = "https://eu.posthog.com";

export function posthogConfigured(): boolean {
  return Boolean(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID);
}

type QueryRow = (string | number | null)[];

async function hogql(query: string, name: string): Promise<QueryRow[]> {
  const host = (process.env.POSTHOG_API_HOST || DEFAULT_HOST).replace(/\/$/, "");
  const project = process.env.POSTHOG_PROJECT_ID;
  const res = await fetch(`${host}/api/projects/${project}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query }, name }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`PostHog query "${name}" failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { results?: QueryRow[] };
  return Array.isArray(data.results) ? data.results : [];
}

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/** @param days rolling window; the dashboard subtitle says "last N days". */
export async function loadStatsFromPostHog(days = 30): Promise<Stats> {
  const since = `now() - INTERVAL ${Math.max(1, Math.floor(days))} DAY`;

  /* Four small aggregates rather than one union — easier to reason about, and a
     failure in one is easier to attribute. They run in parallel. */
  const [opens, picks, shells, navs] = await Promise.all([
    hogql(
      /* Only the invite route — the admin dashboard at /statistics is a
         pageview too, and counting it would inflate "opens". */
      `select count() from events
       where event = '$pageview' and timestamp >= ${since}
       and coalesce(properties['$pathname'], '/') = '/'`,
      "baptism: invite opens"
    ),
    hogql(
      `select properties.paletteId as id, count() as n from events
       where event = 'palette_selected' and timestamp >= ${since} and id != ''
       group by id order by n desc`,
      "baptism: palette picks by id"
    ),
    hogql(
      `select properties.shell as shell, count() as n from events
       where event = 'palette_selected' and timestamp >= ${since} and shell in ('light','dark')
       group by shell`,
      "baptism: light vs dark"
    ),
    hogql(
      `select properties.stop as stop, count() as n from events
       where event = 'map_link_clicked' and timestamp >= ${since} and stop != ''
       group by stop order by n desc`,
      "baptism: navigation clicks by stop"
    ),
  ]);

  const palettePicks: Record<string, number> = {};
  for (const r of picks) palettePicks[str(r[0])] = num(r[1]);

  const shell: Record<ThemeMode, number> = { light: 0, dark: 0 };
  for (const r of shells) {
    const k = str(r[0]);
    if (k === "light" || k === "dark") shell[k] = num(r[1]);
  }

  const nav: Record<string, number> = {};
  for (const r of navs) nav[str(r[0])] = num(r[1]);

  return {
    opens: num(opens[0]?.[0]),
    palettePicks,
    shell,
    nav,
    updatedAt: Date.now(),
  };
}
