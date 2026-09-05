import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BaptismInvitePage } from "./pages/BaptismInvitePage";
import { ThemeFlowOverlay } from "./components/theme/ThemeFlowOverlay";
import { ThemeContrastChecker } from "./components/theme/ThemeContrastChecker";
import { GuestThemePicker } from "./components/theme/GuestThemePicker";
import { usePostHog } from "@posthog/react";
import { recordEvent } from "./lib/statsApi";
import { AdminShell } from "./components/admin/AdminShell";
import { StatisticsPage } from "./pages/StatisticsPage";
import {
  applyThemeChoice,
  bootColorOverride,
  clearDerivedTokens,
  pairFromSettings,
  readSavedOverride,
  resolveShell,
  saveOverride,
  settingsFromPair,
  applyDerivedTokens,
  hexToRgb,
  normalizeHex,
  rgbToHex,
  type SavedTheme,
} from "./lib/themeColors";
import {
  captureAdminTokenFromUrl,
  getGuestPaletteId,
  setGuestPaletteId,
  verifyAdminToken,
  type AccessMode,
} from "./lib/access";
import { fetchPalettes } from "./lib/palettesApi";
import { fetchActiveTheme } from "./lib/activeThemeApi";
import type { Theme } from "./types/theme";

const booted = bootColorOverride();

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function toHex(raw: string | undefined): string | null {
  if (!raw) return null;
  const asHex = normalizeHex(raw);
  if (asHex) return asHex;
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  }
  return null;
}

function hexEq(a: string | undefined, b: string | undefined): boolean {
  const left = toHex(a);
  const right = toHex(b);
  return Boolean(left && right && left === right);
}

function rgbDist(a: string | undefined, b: string | undefined): number {
  const left = hexToRgb(toHex(a) || "");
  const right = hexToRgb(toHex(b) || "");
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return dr * dr + dg * dg + db * db;
}

function palettePair(palette: SavedTheme, mode: Theme) {
  return pairFromSettings(settingsFromPair(palette, mode), mode);
}

const DEFAULT_GUEST_PALETTE_ID = "seed-multi-f";

function findDefaultGuestPalette(list: SavedTheme[]): SavedTheme | null {
  return (
    list.find((p) => p.id === DEFAULT_GUEST_PALETTE_ID) ??
    list.find((p) => (p.kind ?? "multicolor") === "multicolor") ??
    list[0] ??
    null
  );
}

function applyPaletteShell(palette: SavedTheme, shell: Theme, scope: "guest" | "admin" = "guest") {
  const settings = settingsFromPair(palette, shell);
  const pair = pairFromSettings(settings, shell);
  applyDerivedTokens(pair.bg, pair.fg, pair.neutral, pair.kind, {
    neutralSeed: pair.neutralSeed,
    primarySeed: pair.primarySeed,
  });
  saveOverride({ ...pair, shell }, scope);
  document.documentElement.dataset.theme = shell;
  return pair;
}

/** Match the live invite colors to a saved palette; default multi F + light. */
function resolveGuestPalette(
  list: SavedTheme[],
  mode: Theme,
  current: SavedTheme | null
): SavedTheme | null {
  const remembered = getGuestPaletteId();
  if (remembered) {
    const hit = list.find((p) => p.id === remembered);
    if (hit) return hit;
  }
  if (current && list.some((p) => p.id === current.id)) return current;

  const saved = readSavedOverride("guest");
  const liveBg = saved?.bg || cssVar("--color-bg") || cssVar("--background-background");
  const liveAccent = saved?.fg || cssVar("--color-fg-interactive");
  const liveNeutral =
    saved?.neutral || cssVar("--color-fg") || cssVar("--foreground-foreground");

  const looksMulticolor = rgbDist(liveAccent, liveNeutral) > 40 * 40;
  const pool = list.filter((palette) => {
    const kind = palette.kind ?? "multicolor";
    return looksMulticolor ? kind === "multicolor" : kind === "monochrome";
  });

  let best: { palette: SavedTheme; dist: number } | null = null;
  for (const palette of pool) {
    const pair = palettePair(palette, mode);
    if (!hexEq(pair.bg, liveBg)) continue;
    const dist = looksMulticolor
      ? rgbDist(pair.fg, liveAccent)
      : rgbDist(pair.fg, liveNeutral);
    if (!best || dist < best.dist) best = { palette, dist };
  }

  if (best && best.dist <= 40 * 40) return best.palette;

  return findDefaultGuestPalette(list);
}

function AppContent() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (booted) return resolveShell(booted);
    return "light";
  });
  const [themeFlowOpen, setThemeFlowOpen] = useState(false);
  const [themeSyncKey, setThemeSyncKey] = useState(0);
  const posthog = usePostHog();
  const [accessMode, setAccessMode] = useState<AccessMode>("guest");
  const [accessReady, setAccessReady] = useState(false);
  const [guestSelected, setGuestSelected] = useState<SavedTheme | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const adminConfirmRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    recordEvent({ type: "invite_opened" });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!readSavedOverride(accessMode === "admin" ? "admin" : "guest")) {
      clearDerivedTokens();
    }
  }, [accessMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = captureAdminTokenFromUrl();
      if (token) {
        const result = await verifyAdminToken(token);
        if (!cancelled && result.ok) {
          setAccessMode("admin");
          setAccessReady(true);
          return;
        }
      }
      if (!cancelled) {
        setAccessMode("guest");
        setAccessReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Admin: own draft, else published site theme — never the guest localStorage pick. */
  useEffect(() => {
    if (!accessReady || accessMode !== "admin") return;
    let cancelled = false;
    (async () => {
      const draft = readSavedOverride("admin");
      if (draft) {
        const shell = resolveShell(draft);
        applyDerivedTokens(draft.bg, draft.fg, draft.neutral, draft.kind, {
          neutralSeed: draft.neutralSeed,
          primarySeed: draft.primarySeed,
        });
        document.documentElement.dataset.theme = shell;
        setTheme(shell);
        return;
      }

      const [list, published] = await Promise.all([fetchPalettes(), fetchActiveTheme()]);
      if (cancelled || !published) return;
      const hit = list.find((p) => p.id === published.paletteId);
      if (!hit) return;
      applyPaletteShell(hit, published.shell, "admin");
      setTheme(published.shell);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, accessMode]);

  useEffect(() => {
    if (!accessReady || accessMode !== "guest") return;
    let cancelled = false;
    (async () => {
      const [list, published] = await Promise.all([fetchPalettes(), fetchActiveTheme()]);
      if (cancelled) return;

      const rememberedId = getGuestPaletteId();
      const publishedHit = published
        ? list.find((p) => p.id === published.paletteId)
        : null;
      const hit = rememberedId
        ? list.find((p) => p.id === rememberedId) ??
          publishedHit ??
          findDefaultGuestPalette(list)
        : publishedHit ?? findDefaultGuestPalette(list);
      if (!hit) return;

      const saved = readSavedOverride("guest");
      const shell: Theme = rememberedId
        ? saved
          ? resolveShell(saved)
          : published?.shell ?? "light"
        : published?.shell ?? "light";

      applyPaletteShell(hit, shell, "guest");
      setGuestSelected(hit);
      setTheme(shell);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessReady, accessMode]);

  const handleThemeChange = useCallback(
    (next: Theme) => {
      setTheme((current) => {
        if (accessMode === "guest" && guestSelected) {
          applyPaletteShell(guestSelected, next, "guest");
        } else {
          const scope = accessMode === "admin" ? "admin" : "guest";
          const saved = readSavedOverride(scope);
          if (saved) {
            applyThemeChoice(next, saved, current, scope);
          } else {
            clearDerivedTokens();
            document.documentElement.dataset.theme = next;
          }
        }
        setThemeSyncKey((k) => k + 1);
        return next;
      });
    },
    [accessMode, guestSelected]
  );

  const openThemeFlow = useCallback(() => {
    setConfirmError(null);
    setThemeFlowOpen(true);
    setThemeSyncKey((k) => k + 1);
    if (accessMode !== "guest") return;
    void fetchPalettes().then((list) => {
      const current = resolveGuestPalette(list, theme, guestSelected);
      if (current) setGuestSelected(current);
    });
  }, [accessMode, theme, guestSelected]);

  const closeThemeFlow = useCallback(() => {
    setThemeFlowOpen(false);
  }, []);

  const applyGuestPalette = useCallback(
    (palette: SavedTheme) => {
      setGuestSelected(palette);
      applyPaletteShell(palette, theme, "guest");
    },
    [theme]
  );

  const confirmGuestPalette = useCallback(() => {
    if (!guestSelected) return;
    const pair = pairFromSettings(settingsFromPair(guestSelected, theme), theme);
    saveOverride({ ...pair, shell: theme }, "guest");
    setGuestPaletteId(guestSelected.id);
    // Counted by id, never by name — palette labels are positional and shift on delete.
    recordEvent({ type: "palette_selected", paletteId: guestSelected.id, shell: theme });
    posthog?.capture(
      "palette_selected",
      {
        paletteId: guestSelected.id,
        paletteName: guestSelected.name,
        kind: guestSelected.kind ?? "multicolor",
        shell: theme,
      },
      { send_instantly: true }
    );
  }, [guestSelected, theme, posthog]);

  const confirmAdminTheme = useCallback(async () => {
    setConfirmError(null);
    try {
      const run = adminConfirmRef.current;
      if (!run) {
        throw new Error("Wybierz paletę przed potwierdzeniem.");
      }
      await run();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Nie udało się zapisać motywu.");
      throw err;
    }
  }, []);

  const isAdmin = accessMode === "admin";

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            /* Admins keep the shell on Main view, so the sidebar (and the way
               back to Statistics) never disappears. Guests get the plain invite. */
            !accessReady ? (
              <BaptismInvitePage onThemeOpen={openThemeFlow} />
            ) : isAdmin ? (
              <AdminShell
                title="Main view"
                onThemeOpen={openThemeFlow}
                theme={theme}
                onThemeChange={handleThemeChange}
              >
                <BaptismInvitePage onThemeOpen={openThemeFlow} chrome={false} />
              </AdminShell>
            ) : (
              <BaptismInvitePage onThemeOpen={openThemeFlow} />
            )
          }
        />
        <Route
          path="/statistics"
          element={
            /* Admin only. A guest who guesses the URL gets the invite, not a 404 —
               the statistics route should not advertise that it exists. */
            !accessReady ? null : isAdmin ? (
              <AdminShell
                title="Statistics"
                onThemeOpen={openThemeFlow}
                theme={theme}
                onThemeChange={handleThemeChange}
              >
                <StatisticsPage />
              </AdminShell>
            ) : (
              <BaptismInvitePage onThemeOpen={openThemeFlow} />
            )
          }
        />
      </Routes>

      <ThemeFlowOverlay
        open={themeFlowOpen}
        onClose={closeThemeFlow}
        theme={theme}
        onThemeChange={handleThemeChange}
        showShellToggle
        title={isAdmin ? "Nastawienia" : "Wybierz kolory"}
        confirmLabel="Potwierdź"
        confirmDisabled={!isAdmin && !guestSelected}
        onConfirm={isAdmin ? confirmAdminTheme : confirmGuestPalette}
      >
        {isAdmin ? (
          <>
            <ThemeContrastChecker
              theme={theme}
              onThemeChange={handleThemeChange}
              syncKey={themeSyncKey}
              onRegisterConfirm={(fn) => {
                adminConfirmRef.current = fn;
              }}
            />
            {confirmError ? (
              <p className="cc-saved__error" role="alert">
                {confirmError}
              </p>
            ) : null}
          </>
        ) : (
          <GuestThemePicker
            theme={theme}
            selectedId={guestSelected?.id ?? null}
            onSelect={applyGuestPalette}
            syncKey={themeSyncKey}
          />
        )}
      </ThemeFlowOverlay>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
