import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BaptismInvitePage } from "./pages/BaptismInvitePage";
import { ThemeFlowOverlay } from "./components/theme/ThemeFlowOverlay";
import { ThemeContrastChecker } from "./components/theme/ThemeContrastChecker";
import { GuestThemePicker } from "./components/theme/GuestThemePicker";
import {
  applyThemeChoice,
  bootColorOverride,
  clearDerivedTokens,
  pairFromSettings,
  readSavedOverride,
  saveOverride,
  settingsFromPair,
  shellThemeFromPair,
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

/** Match the live invite colors to a saved palette; default Paleta A. */
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

  const saved = readSavedOverride();
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

  return list.find((p) => p.id === "seed-mono-a") ?? list.find((p) => p.kind === "monochrome") ?? list[0] ?? null;
}

function AppContent() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (booted) return shellThemeFromPair(booted.bg, booted.fg);
    return "light";
  });
  const [themeFlowOpen, setThemeFlowOpen] = useState(false);
  const [themeSyncKey, setThemeSyncKey] = useState(0);
  const [accessMode, setAccessMode] = useState<AccessMode>("guest");
  const [accessReady, setAccessReady] = useState(false);
  const [guestSelected, setGuestSelected] = useState<SavedTheme | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!readSavedOverride()) {
      clearDerivedTokens();
    }
  }, []);

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

  useEffect(() => {
    if (!accessReady || accessMode !== "guest") return;
    const id = getGuestPaletteId();
    if (!id) return;
    let cancelled = false;
    fetchPalettes().then((list) => {
      if (cancelled) return;
      const hit = list.find((p) => p.id === id);
      if (!hit) return;
      const shellGuess: Theme = shellThemeFromPair(hit.bg, hit.fg);
      const settings = settingsFromPair(hit, shellGuess);
      const pair = pairFromSettings(settings, shellGuess);
      applyDerivedTokens(pair.bg, pair.fg, pair.neutral, pair.kind, {
        neutralSeed: pair.neutralSeed,
        primarySeed: pair.primarySeed,
      });
      saveOverride(pair);
      setTheme(shellGuess);
      document.documentElement.dataset.theme = shellGuess;
    });
    return () => {
      cancelled = true;
    };
  }, [accessReady, accessMode]);

  const handleThemeChange = useCallback(
    (next: Theme) => {
      setTheme((current) => {
        if (accessMode === "guest" && guestSelected) {
          const settings = settingsFromPair(guestSelected, next);
          const pair = pairFromSettings(settings, next);
          applyDerivedTokens(pair.bg, pair.fg, pair.neutral, pair.kind, {
            neutralSeed: pair.neutralSeed,
            primarySeed: pair.primarySeed,
          });
        } else {
          const saved = readSavedOverride();
          if (saved) {
            applyThemeChoice(next, saved, current);
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
      const settings = settingsFromPair(palette, theme);
      const pair = pairFromSettings(settings, theme);
      applyDerivedTokens(pair.bg, pair.fg, pair.neutral, pair.kind, {
        neutralSeed: pair.neutralSeed,
        primarySeed: pair.primarySeed,
      });
      const shell = shellThemeFromPair(pair.bg, pair.fg);
      if (shell !== theme) {
        setTheme(shell);
        document.documentElement.dataset.theme = shell;
      }
    },
    [theme]
  );

  const confirmGuestPalette = useCallback(() => {
    if (!guestSelected) return;
    const settings = settingsFromPair(guestSelected, theme);
    const pair = pairFromSettings(settings, theme);
    saveOverride(pair);
    setGuestPaletteId(guestSelected.id);
  }, [guestSelected, theme]);

  const isAdmin = accessMode === "admin";

  return (
    <>
      <Routes>
        <Route path="/" element={<BaptismInvitePage onThemeOpen={openThemeFlow} />} />
      </Routes>

      <ThemeFlowOverlay
        open={themeFlowOpen}
        onClose={closeThemeFlow}
        theme={theme}
        onThemeChange={handleThemeChange}
        showShellToggle
        title={isAdmin ? "Nastawienia" : "Wybierz twoje kolory"}
        confirmLabel="Potwierdź"
        confirmDisabled={!isAdmin && !guestSelected}
        onConfirm={isAdmin ? undefined : confirmGuestPalette}
      >
        {isAdmin ? (
          <ThemeContrastChecker
            theme={theme}
            onThemeChange={handleThemeChange}
            syncKey={themeSyncKey}
          />
        ) : (
          <GuestThemePicker
            theme={theme}
            selectedId={guestSelected?.id ?? null}
            onSelect={applyGuestPalette}
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
