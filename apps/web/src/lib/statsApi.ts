import type { ThemeMode } from "./themeColors";

export type StatsEvent =
  | { type: "invite_opened" }
  | { type: "palette_selected"; paletteId: string; shell?: ThemeMode }
  | { type: "nav_clicked"; stop: string };

export type Stats = {
  opens: number;
  palettePicks: Record<string, number>;
  shell: Record<ThemeMode, number>;
  nav: Record<string, number>;
  updatedAt: number;
};

export const EMPTY_STATS: Stats = {
  opens: 0,
  palettePicks: {},
  shell: { light: 0, dark: 0 },
  nav: {},
  updatedAt: 0,
};

/**
 * Fire-and-forget beacon. Never awaited by the UI and never throws — counting
 * must not be able to break the invite for a guest.
 */
export function recordEvent(event: StatsEvent): void {
  try {
    const body = JSON.stringify(event);
    // sendBeacon survives the page unload that follows a Nawigacja tap.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/stats", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export type StatsSource = "posthog" | "counters";

export type StatsResult = {
  stats: Stats;
  source: StatsSource;
  /** Present when PostHog was configured but the query failed. */
  warning?: string;
  days?: number;
};

export async function fetchStats(token: string): Promise<StatsResult> {
  const res = await fetch("/api/stats", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    stats?: Stats; error?: string; source?: StatsSource; warning?: string; days?: number;
  };
  if (!res.ok) throw new Error(data.error || `Stats failed (${res.status})`);
  return {
    stats: { ...EMPTY_STATS, ...(data.stats ?? {}) },
    source: data.source ?? "counters",
    warning: data.warning,
    days: data.days,
  };
}
