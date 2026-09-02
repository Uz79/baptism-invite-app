import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BaptismInvitePage } from "./pages/BaptismInvitePage";
import { ThemeFlowOverlay } from "./components/theme/ThemeFlowOverlay";
import { ThemeContrastChecker } from "./components/theme/ThemeContrastChecker";
import {
  applyThemeChoice,
  bootColorOverride,
  clearDerivedTokens,
  readSavedOverride,
  shellThemeFromPair,
} from "./lib/themeColors";
import type { Theme } from "./types/theme";

const booted = bootColorOverride();

function AppContent() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (booted) return shellThemeFromPair(booted.bg, booted.fg);
    return "light";
  });
  const [themeFlowOpen, setThemeFlowOpen] = useState(false);
  const [themeSyncKey, setThemeSyncKey] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!readSavedOverride()) {
      clearDerivedTokens();
    }
  }, []);

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
    setThemeFlowOpen(true);
    setThemeSyncKey((k) => k + 1);
  }, []);

  const closeThemeFlow = useCallback(() => {
    setThemeFlowOpen(false);
  }, []);

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
      >
        <ThemeContrastChecker
          theme={theme}
          onThemeChange={handleThemeChange}
          syncKey={themeSyncKey}
        />
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
