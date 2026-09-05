import { getStoredAdminToken } from "./access";
import type { Theme } from "../types/theme";

export type ActiveTheme = {
  paletteId: string;
  shell: Theme;
  updatedAt: number;
};

function authHeaders(): HeadersInit {
  const token = getStoredAdminToken();
  return token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { "Content-Type": "application/json" };
}

export async function fetchActiveTheme(): Promise<ActiveTheme | null> {
  try {
    const res = await fetch("/api/active-theme", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { activeTheme?: ActiveTheme | null };
    const theme = data.activeTheme;
    if (!theme?.paletteId) return null;
    const shell = theme.shell === "dark" ? "dark" : "light";
    return { paletteId: theme.paletteId, shell, updatedAt: Number(theme.updatedAt) || 0 };
  } catch {
    return null;
  }
}

export async function publishActiveTheme(
  paletteId: string,
  shell: Theme
): Promise<ActiveTheme> {
  const res = await fetch("/api/active-theme", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ paletteId, shell }),
  });
  const data = (await res.json()) as { activeTheme?: ActiveTheme; error?: string };
  if (!res.ok || !data.activeTheme) {
    throw new Error(data.error || `Publish failed (${res.status})`);
  }
  return data.activeTheme;
}
