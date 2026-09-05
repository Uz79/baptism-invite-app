import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put, list } from "@vercel/blob";

const BLOB_PATHNAME = "baptism-invite/stats.json";

export type ThemeMode = "light" | "dark";

export type Stats = {
  /** Invite opened (one per page load). */
  opens: number;
  /** Confirmed palette picks, keyed by palette id — never by name, which is positional. */
  palettePicks: Record<string, number>;
  /** Shell mode at the moment a palette was confirmed. */
  shell: Record<ThemeMode, number>;
  /** Nawigacja clicks, keyed by schedule stop title. */
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

function localFile(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dir, "../data/stats.json");
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalise(raw: unknown): Stats {
  const r = (raw ?? {}) as Partial<Stats>;
  return {
    opens: typeof r.opens === "number" ? r.opens : 0,
    palettePicks: r.palettePicks && typeof r.palettePicks === "object" ? { ...r.palettePicks } : {},
    shell: {
      light: r.shell && typeof r.shell.light === "number" ? r.shell.light : 0,
      dark: r.shell && typeof r.shell.dark === "number" ? r.shell.dark : 0,
    },
    nav: r.nav && typeof r.nav === "object" ? { ...r.nav } : {},
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

async function readBlob(): Promise<Stats | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const hit = blobs.find((b) => b.pathname === BLOB_PATHNAME) ?? blobs[0];
    if (!hit?.url) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return null;
    return normalise(await res.json());
  } catch {
    return null;
  }
}

async function writeBlob(stats: Stats): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(stats, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

function readLocal(): Stats {
  try {
    const f = localFile();
    if (!fs.existsSync(f)) return { ...EMPTY_STATS };
    return normalise(JSON.parse(fs.readFileSync(f, "utf8")));
  } catch {
    return { ...EMPTY_STATS };
  }
}

function writeLocal(stats: Stats): void {
  const f = localFile();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(stats, null, 2), "utf8");
}

export async function loadStats(): Promise<Stats> {
  if (hasBlob()) return (await readBlob()) ?? { ...EMPTY_STATS };
  return readLocal();
}

export type StatsEvent =
  | { type: "invite_opened" }
  | { type: "palette_selected"; paletteId: string; shell?: ThemeMode }
  | { type: "nav_clicked"; stop: string };

/** Apply one event. Read-modify-write: fine at this scale, see note in the API route. */
export async function recordStats(event: StatsEvent): Promise<Stats> {
  const stats = await loadStats();

  if (event.type === "invite_opened") {
    stats.opens += 1;
  } else if (event.type === "palette_selected") {
    const id = String(event.paletteId).slice(0, 80);
    stats.palettePicks[id] = (stats.palettePicks[id] ?? 0) + 1;
    if (event.shell === "light" || event.shell === "dark") {
      stats.shell[event.shell] += 1;
    }
  } else if (event.type === "nav_clicked") {
    const stop = String(event.stop).slice(0, 120);
    stats.nav[stop] = (stats.nav[stop] ?? 0) + 1;
  }

  stats.updatedAt = Date.now();

  if (hasBlob()) {
    try {
      await writeBlob(stats);
    } catch {
      /* Counting must never break the invite for a guest. */
    }
  } else {
    writeLocal(stats);
  }
  return stats;
}
