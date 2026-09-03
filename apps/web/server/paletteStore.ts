import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put, list } from "@vercel/blob";

import { SEED_PALETTES } from "../src/data/seedPalettes";

const BLOB_PATHNAME = "baptism-invite/palettes.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_FILE = path.resolve(__dirname, "../data/palettes.json");

export type StoredPalette = {
  id: string;
  name: string;
  bg: string;
  fg: string;
  neutral?: string;
  kind?: "monochrome" | "multicolor";
  neutralSeed?: string;
  primarySeed?: string;
  bgIndex?: number;
  fgIndex?: number;
  primaryIndex?: number;
  contrastByShell?: Record<string, { bgIndex: number; fgIndex: number }>;
  primaryByShell?: Record<string, number>;
  createdAt: number;
};

const SEED: StoredPalette[] = SEED_PALETTES;

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function readLocal(): StoredPalette[] {
  try {
    if (!fs.existsSync(LOCAL_FILE)) {
      fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(SEED, null, 2), "utf8");
      return structuredClone(SEED);
    }
    const raw = JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8")) as unknown;
    if (!Array.isArray(raw)) return structuredClone(SEED);
    return raw as StoredPalette[];
  } catch {
    return structuredClone(SEED);
  }
}

function writeLocal(list: StoredPalette[]): void {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(list, null, 2), "utf8");
}

async function readBlob(): Promise<StoredPalette[] | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const hit = blobs.find((b) => b.pathname === BLOB_PATHNAME) ?? blobs[0];
    if (!hit?.url) return null;
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return null;
    return raw as StoredPalette[];
  } catch {
    return null;
  }
}

async function writeBlob(list: StoredPalette[]): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(list, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function loadPalettes(): Promise<StoredPalette[]> {
  if (hasBlob()) {
    const fromBlob = await readBlob();
    if (fromBlob && fromBlob.length > 0) return fromBlob;
    await writeBlob(SEED);
    return structuredClone(SEED);
  }
  return readLocal();
}

export async function savePalettes(list: StoredPalette[]): Promise<{ ok: true } | { ok: false; error: string }> {
  if (hasBlob()) {
    await writeBlob(list);
    return { ok: true };
  }
  // Local / vercel-less: persist to disk so guests on same machine share.
  // On Vercel without Blob, disk is ephemeral — refuse so admin knows to connect Blob.
  if (process.env.VERCEL) {
    return {
      ok: false,
      error:
        "Shared palette storage is not configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
    };
  }
  writeLocal(list);
  return { ok: true };
}

export function getAdminToken(): string {
  return (process.env.ADMIN_TOKEN || "").trim();
}

export function isAuthorized(authHeader: string | undefined): boolean {
  const expected = getAdminToken();
  if (!expected) return false;
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return match[1].trim() === expected;
}
