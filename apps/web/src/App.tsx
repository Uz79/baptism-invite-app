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

  const handleThemeChange = useCallback((next: Theme) => {
    setTheme((current) => {
      const saved = readSavedOverride();
      if (saved) {
        applyThemeChoice(next, saved, current);
      } else {
        clearDerivedTokens();
        document.documentElement.dataset.theme = next;
      }
      setThemeSyncKey((k) => k + 1);
      return next;
    });
  }, []);

  const openThemeFlow = useCallback(() => {
    setGuestSelected(null);
    setThemeFlowOpen(true);
    setThemeSyncKey((k) => k + 1);
  }, []);

  const closeThemeFlow = useCallback(() => {
    setThemeFlowOpen(false);
    setGuestSelected(null);
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
        onThemeChange={isAdmin ? handleThemeChange : undefined}
        showShellToggle={isAdmin}
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
