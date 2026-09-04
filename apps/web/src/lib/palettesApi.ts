import { withDisplayNames, type SavedTheme } from "./themeColors";
import { getStoredAdminToken } from "./access";
import { SEED_PALETTES } from "../data/seedPalettes";

function authHeaders(): HeadersInit {
  const token = getStoredAdminToken();
  return token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { "Content-Type": "application/json" };
}

export async function fetchPalettes(): Promise<SavedTheme[]> {
  try {
    const res = await fetch("/api/palettes", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { palettes?: SavedTheme[] };
    if (Array.isArray(data.palettes) && data.palettes.length > 0) {
      return withDisplayNames(data.palettes);
    }
  } catch {
    /* fall through to seed */
  }
  return withDisplayNames(SEED_PALETTES);
}

export async function createPalette(palette: SavedTheme): Promise<SavedTheme[]> {
  const res = await fetch("/api/palettes", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ palette }),
  });
  const data = (await res.json()) as { palettes?: SavedTheme[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Save failed (${res.status})`);
  }
  return withDisplayNames(data.palettes ?? []);
}

export async function deletePalette(id: string): Promise<SavedTheme[]> {
  const res = await fetch(`/api/palettes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = (await res.json()) as { palettes?: SavedTheme[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Delete failed (${res.status})`);
  }
  return withDisplayNames(data.palettes ?? []);
}
