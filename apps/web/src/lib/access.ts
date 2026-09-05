const ADMIN_TOKEN_KEY = "baptismInviteAdminToken";
const GUEST_PALETTE_KEY = "baptismInviteGuestPaletteId";
const ACTIVE_PALETTE_KEY = "baptismInviteActivePaletteId";

export type AccessMode = "admin" | "guest";

/** Pull ?admin=TOKEN from the URL into sessionStorage, then strip it from the address bar. */
export function captureAdminTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("admin")?.trim();
    if (!token) return getStoredAdminToken();

    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    url.searchParams.delete("admin");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
    return token;
  } catch {
    return getStoredAdminToken();
  }
}

export function getStoredAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getGuestPaletteId(): string | null {
  try {
    return localStorage.getItem(GUEST_PALETTE_KEY);
  } catch {
    return null;
  }
}

export function setGuestPaletteId(id: string): void {
  try {
    localStorage.setItem(GUEST_PALETTE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Last palette id applied in admin (survives Light/Dark shell swaps). */
export function getActivePaletteId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PALETTE_KEY);
  } catch {
    return null;
  }
}

export function setActivePaletteId(id: string | null): void {
  try {
    if (!id) localStorage.removeItem(ACTIVE_PALETTE_KEY);
    else localStorage.setItem(ACTIVE_PALETTE_KEY, id);
  } catch {
    /* ignore */
  }
}

export async function verifyAdminToken(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/check", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Unauthorized" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach admin check API" };
  }
}
