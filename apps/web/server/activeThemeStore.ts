import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put, list } from "@vercel/blob";

const BLOB_PATHNAME = "baptism-invite/active-theme.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_FILE = path.resolve(__dirname, "../data/active-theme.json");

export type ActiveTheme = {
  paletteId: string;
  shell: "light" | "dark";
  updatedAt: number;
};

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function readLocal(): ActiveTheme | null {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as unknown;
    return parseActiveTheme(raw);
  } catch {
    return null;
  }
}

function writeLocal(theme: ActiveTheme): void {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(theme, null, 2), "utf8");
}

function parseActiveTheme(raw: unknown): ActiveTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const paletteId = typeof obj.paletteId === "string" ? obj.paletteId.trim() : "";
  const shell = obj.shell === "dark" ? "dark" : obj.shell === "light" ? "light" : null;
  if (!paletteId || !shell) return null;
  const updatedAt = Number.isFinite(obj.updatedAt) ? Number(obj.updatedAt) : Date.now();
  return { paletteId, shell, updatedAt };
}

async function readBlob(): Promise<ActiveTheme | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const hit = blobs.find((b) => b.pathname === BLOB_PATHNAME) ?? blobs[0];
    if (!hit?.url) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return null;
    return parseActiveTheme(await res.json());
  } catch {
    return null;
  }
}

async function writeBlob(theme: ActiveTheme): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(theme, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function loadActiveTheme(): Promise<ActiveTheme | null> {
  if (hasBlob()) {
    return (await readBlob()) ?? null;
  }
  return readLocal();
}

export async function saveActiveTheme(
  theme: ActiveTheme
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (hasBlob()) {
    await writeBlob(theme);
    return { ok: true };
  }
  if (process.env.VERCEL) {
    return {
      ok: false,
      error:
        "Shared theme storage is not configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
    };
  }
  writeLocal(theme);
  return { ok: true };
}
