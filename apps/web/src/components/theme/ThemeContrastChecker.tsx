import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Select, SegmentedControl } from "@cartography-lab/ui";
import { ThemeSetColorDialog } from "./ThemeSetColorDialog";
import { DeletePaletteDialog } from "./DeletePaletteDialog";
import type { Theme } from "../../types/theme";
import { createPalette, deletePalette, fetchPalettes } from "../../lib/palettesApi";
import { getActivePaletteId, setActivePaletteId } from "../../lib/access";
import { publishActiveTheme } from "../../lib/activeThemeApi";
import {
  applyDerivedTokens,
  buildMonochromeSequences,
  buildPrimaryAccessibilityReport,
  buildPrimarySequence,
  canonicalThemeSettings,
  clampSequenceIndex,
  clearSavedOverride,
  findClosestSequenceIndex,
  findPrimarySeedIndex,
  findSeedIndexInSequence,
  formatNeutralTokenLabel,
  formatPrimaryTokenLabel,
  getPrimarySeedBlockMessage,
  inkOnPrimaryControl,
  makeThemeId,
  nextThemeName,
  normalizeHex,
  pairFromSettings,
  pickInvertedInk,
  readCanonicalFromTheme,
  readSavedOverride,
  saveOverride,
  settingsFromPair,
  withShellThemeState,
  type PrimaryShellReport,
  type SavedTheme,
  type ThemeKind,
  type ThemeSettings,
} from "../../lib/themeColors";

interface ThemeContrastCheckerProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  syncKey: number;
  /** Register admin Potwierdź → publish this palette + shell for guests. */
  onRegisterConfirm?: (confirm: (() => Promise<void>) | null) => void;
}

type DialogTarget = "neutral" | "primary" | null;

function PlusIcon() {
  return (
    <svg className="cc-theme-card__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="cc-theme-card__trash-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9 4h6M5 7h14M8 7v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M10 11v5M14 11v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SequenceRow({
  label,
  sequence,
  selectedIndex,
  seedIndex,
  tokenRow,
  shell,
  onSelect,
}: {
  label: string;
  sequence: string[];
  selectedIndex: number;
  seedIndex: number;
  tokenRow: "background" | "foreground" | "primary";
  shell: Theme;
  onSelect: (index: number) => void;
}) {
  const tokenLabel =
    tokenRow === "primary"
      ? formatPrimaryTokenLabel(selectedIndex)
      : formatNeutralTokenLabel(selectedIndex, tokenRow, shell);
  const chipCount = sequence.length;

  return (
    <div className="cc-sequence-row">
      <p
        className={`cc-sequence-row__label${
          tokenRow === "primary" ? " cc-sequence-row__label--field" : ""
        }`}
      >
        {label}
      </p>
      <div
        className="cc-sequence-row__grid"
        style={
          {
            "--cc-chip-count": chipCount,
          } as React.CSSProperties
        }
      >
        <div className="cc-sequence-row__ramp" role="list" aria-label={label}>
        {sequence.map((color, index) => {
          const selected = index === selectedIndex;
          const isSeed = index === seedIndex;
          const chipTokenLabel =
            tokenRow === "primary"
              ? formatPrimaryTokenLabel(index)
              : formatNeutralTokenLabel(index, tokenRow, shell);
          return (
            <div key={`${label}-${index}-${color}`} className="cc-sequence-chip-cell" role="listitem">
              <div className="cc-sequence-chip-track">
                <button
                  type="button"
                  className={`cc-sequence-chip${selected ? " cc-sequence-chip--selected" : ""}`}
                  style={{ background: color }}
                  aria-label={`${label} ${chipTokenLabel}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(index)}
                />
              </div>
              <div className="cc-sequence-dot-slot">
                {selected ? (
                  <span className="cc-sequence-chip__dot" aria-hidden />
                ) : isSeed ? (
                  <span className="cc-sequence-chip__seed" aria-hidden />
                ) : null}
              </div>
              {selected ? <p className="cc-sequence-row__token">{tokenLabel}</p> : null}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg className="cc-set-circle__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrimaryShellA11yRow({
  report,
  editing,
}: {
  report: PrimaryShellReport;
  editing: boolean;
}) {
  const badge =
    report.status === "ok" ? "✓" : report.status === "blocked" ? "✕" : report.status === "adapted" ? "↦" : "⚠";
  return (
    <div
      className={`cc-primary-a11y__row${editing ? " cc-primary-a11y__row--editing" : ""}`}
      role="listitem"
    >
      <span
        className={`cc-primary-a11y__badge cc-primary-a11y__badge--${report.status}`}
        aria-hidden
      >
        {badge}
      </span>
      <span className="cc-primary-a11y__shell">{report.shell === "light" ? "Light" : "Dark"}</span>
      <span className="cc-primary-a11y__hint">{report.hint}</span>
    </div>
  );
}

function PrimaryAccessibilityHints({
  activeShell,
  light,
  dark,
  seedBlocked,
  blockMessage,
}: {
  activeShell: Theme;
  light: PrimaryShellReport;
  dark: PrimaryShellReport;
  seedBlocked: boolean;
  blockMessage: string | null;
}) {
  return (
    <div className="cc-primary-a11y" aria-live="polite">
      <p className="cc-primary-a11y__editing">
        Editing primary for: <strong>{activeShell === "light" ? "Light" : "Dark"}</strong>
      </p>
      {seedBlocked && blockMessage ? (
        <p className="cc-primary-a11y__block" role="alert">
          {blockMessage}
        </p>
      ) : null}
      <div className="cc-primary-a11y__list" role="list" aria-label="Primary contrast by theme">
        <PrimaryShellA11yRow report={light} editing={activeShell === "light"} />
        <PrimaryShellA11yRow report={dark} editing={activeShell === "dark"} />
      </div>
    </div>
  );
}

type PaletteCarouselProps = {
  label: string;
  items: SavedTheme[];
  theme: Theme;
  settings: ThemeSettings;
  activePaletteId: string | null;
  /** Palette to bring into view — the one just added. */
  focusId: string | null;
  busy: boolean;
  onApply: (t: SavedTheme) => void;
  onDelete: (t: SavedTheme) => void;
};

function PaletteCarousel({
  label,
  items,
  theme,
  settings,
  activePaletteId,
  focusId,
  busy,
  onApply,
  onDelete,
}: PaletteCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const headId = items[0]?.id ?? null;

  /**
   * New palettes are appended, so the one you just saved sits off-screen to the
   * right. Scroll it into view when it appears. Otherwise reset to the start
   * whenever the head of the list changes (a delete, or a refetch on reopen),
   * since the browser would otherwise keep a stale scrollLeft.
   */
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    if (focusId) {
      const el = box.querySelector<HTMLElement>(`[data-palette-id="${focusId}"]`);
      if (el) {
        const delta = el.getBoundingClientRect().left - box.getBoundingClientRect().left;
        box.scrollBy({ left: delta, behavior: "smooth" });
        return;
      }
    }
  }, [focusId, items.length]);

  useLayoutEffect(() => {
    if (focusId) return;
    ref.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [headId, focusId]);

  return (
    <div className="cc-saved__group">
      <p className="cc-saved__subtitle">{label}</p>
      {items.length === 0 ? (
        <p className="cc-saved__empty">Brak zapisanych palet.</p>
      ) : (
        <div ref={ref} className="palette-carousel" role="list" aria-label={label}>
          {items.map((t) => {
            const tSettings = settingsFromPair(t, theme);
            const tPair = pairFromSettings(tSettings, theme);
            const kindMatches = (t.kind ?? "multicolor") === settings.kind;
            const selected = Boolean(
              kindMatches && activePaletteId && t.id === activePaletteId
            );
            return (
              <div
                key={t.id}
                className="palette-carousel__item"
                role="listitem"
                data-palette-id={t.id}
              >
                <div
                  className={`cc-theme-card${selected ? " cc-theme-card--selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={(e) => {
                    onApply(t);
                    (e.currentTarget as HTMLElement).blur();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onApply(t);
                    }
                  }}
                >
                  <span className="cc-theme-card__header">
                    <span className="cc-theme-card__title">{t.name}</span>
                    <span className="cc-theme-card__actions">
                      <button
                        type="button"
                        className="cc-theme-card__trash"
                        aria-label={`Delete ${t.name}`}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(t);
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  </span>
                  <span className="cc-theme-card__row">
                    <span
                      className="cc-theme-card__swatch"
                      style={{ background: tPair.neutral ?? tPair.fg }}
                      aria-hidden
                    />
                    <span className="cc-theme-card__row-label">Pierwszy plan</span>
                  </span>
                  <span className="cc-theme-card__row">
                    <span
                      className="cc-theme-card__swatch"
                      style={{ background: tPair.bg }}
                      aria-hidden
                    />
                    <span className="cc-theme-card__row-label">Tło</span>
                  </span>
                  {tSettings.kind === "multicolor" ? (
                    <span className="cc-theme-card__row">
                      <span
                        className="cc-theme-card__swatch"
                        style={{ background: tPair.fg }}
                        aria-hidden
                      />
                      <span className="cc-theme-card__row-label">Podstawowy</span>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ThemeContrastChecker({
  theme,
  onThemeChange: _onThemeChange,
  syncKey,
  onRegisterConfirm,
}: ThemeContrastCheckerProps) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = readSavedOverride("admin");
    const base = saved ?? readCanonicalFromTheme(theme);
    return settingsFromPair(base, theme);
  });
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedTheme | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const [paletteBusy, setPaletteBusy] = useState(false);
  const [activePaletteId, setActivePaletteIdState] = useState<string | null>(() =>
    getActivePaletteId()
  );
  const [focusPaletteId, setFocusPaletteId] = useState<string | null>(null);

  const rememberActivePalette = useCallback((id: string | null) => {
    setActivePaletteIdState(id);
    setActivePaletteId(id);
  }, []);

  const syncFromLive = useCallback(() => {
    const saved = readSavedOverride("admin");
    const base = saved ?? readCanonicalFromTheme(theme);
    const nextSettings = settingsFromPair(base, theme);
    setSettings(nextSettings);
    const pair = pairFromSettings(nextSettings, theme);
    applyDerivedTokens(pair.bg, pair.fg, pair.neutral, pair.kind, {
      neutralSeed: pair.neutralSeed,
      primarySeed: pair.primarySeed,
    });
  }, [theme]);

  useEffect(() => {
    syncFromLive();
  }, [syncKey, syncFromLive]);

  useEffect(() => {
    let cancelled = false;
    fetchPalettes()
      .then((list) => {
        if (cancelled) return;
        setSavedThemes(list);
        const remembered = getActivePaletteId();
        if (remembered && list.some((p) => p.id === remembered)) {
          rememberActivePalette(remembered);
          return;
        }
        const saved = readSavedOverride("admin");
        if (!saved) return;
        const live = settingsFromPair(saved, theme);
        const match = list.find((t) => {
          const tSettings = settingsFromPair(t, theme);
          return (
            tSettings.kind === live.kind &&
            tSettings.neutralSeed === live.neutralSeed &&
            tSettings.primarySeed === live.primarySeed &&
            tSettings.bgIndex === live.bgIndex &&
            tSettings.fgIndex === live.fgIndex &&
            tSettings.primaryIndex === live.primaryIndex
          );
        });
        if (match) rememberActivePalette(match.id);
      })
      .catch(() => {
        if (!cancelled) setPaletteError("Could not load shared palettes.");
      });
    return () => {
      cancelled = true;
    };
  }, [syncKey, theme, rememberActivePalette]);

  useEffect(() => {
    if (!onRegisterConfirm) return;
    onRegisterConfirm(async () => {
      const id = activePaletteId ?? getActivePaletteId();
      if (!id) {
        throw new Error("Wybierz paletę przed potwierdzeniem.");
      }
      const pair = pairFromSettings(settings, theme);
      saveOverride({ ...pair, shell: theme }, "admin");
      await publishActiveTheme(id, theme);
      rememberActivePalette(id);
    });
    return () => onRegisterConfirm(null);
  }, [onRegisterConfirm, activePaletteId, settings, theme, rememberActivePalette]);

  const monochromePalettes = useMemo(
    () => savedThemes.filter((t) => (t.kind ?? "multicolor") === "monochrome"),
    [savedThemes]
  );

  const multicolorPalettes = useMemo(
    () => savedThemes.filter((t) => (t.kind ?? "multicolor") === "multicolor"),
    [savedThemes]
  );

  const monochromeSeq = useMemo(
    () => buildMonochromeSequences(settings.neutralSeed, theme),
    [settings.neutralSeed, theme]
  );
  const foregroundSequence = monochromeSeq.foreground;
  const backgroundSequence = monochromeSeq.background;

  const neutralSeedIndex = useMemo(
    () => findSeedIndexInSequence(monochromeSeq.foreground, settings.neutralSeed),
    [settings.neutralSeed, monochromeSeq.foreground]
  );

  const primarySequence = useMemo(
    () => buildPrimarySequence(settings.primarySeed),
    [settings.primarySeed]
  );

  const primarySeedIndex = useMemo(
    () => findSeedIndexInSequence(primarySequence, settings.primarySeed),
    [settings.primarySeed, primarySequence]
  );

  const storedThemeState = useMemo(() => {
    const saved = readSavedOverride("admin");
    if (!saved) return undefined;
    return {
      contrastByShell: saved.contrastByShell,
      primaryByShell: saved.primaryByShell,
    };
  }, [settings]);

  const primaryA11y = useMemo(
    () => buildPrimaryAccessibilityReport(settings, theme, storedThemeState),
    [settings, theme, storedThemeState]
  );

  const validatePrimarySeed = useCallback(
    (hex: string) => getPrimarySeedBlockMessage(hex, settings, theme, storedThemeState),
    [settings, theme, storedThemeState]
  );
  const neutralCircleFill =
    foregroundSequence[settings.fgIndex] ?? settings.neutralSeed;

  const primaryCircleFill =
    primarySequence[settings.primaryIndex] ?? settings.primarySeed;

  const selectedBackgroundColor =
    backgroundSequence[settings.bgIndex] ?? settings.neutralSeed;

  const selectedNeutralForeground =
    foregroundSequence[settings.fgIndex] ?? settings.neutralSeed;

  const selectedPrimaryAccent =
    primarySequence[settings.primaryIndex] ?? settings.primarySeed;

  const neutralCircleInk = pickInvertedInk(neutralCircleFill, selectedBackgroundColor, [
    selectedNeutralForeground,
    selectedPrimaryAccent,
  ]);

  const primaryCircleInk =
    settings.kind === "multicolor"
      ? inkOnPrimaryControl(
          primaryCircleFill,
          selectedBackgroundColor,
          selectedNeutralForeground,
          theme
        )
      : pickInvertedInk(primaryCircleFill, selectedBackgroundColor, [
          selectedNeutralForeground,
          selectedPrimaryAccent,
        ]);

  const commitSettings = useCallback(
    (next: ThemeSettings, opts?: { persist?: boolean; syncShell?: boolean }) => {
      const persist = opts?.persist !== false;
      const syncShell = opts?.syncShell !== false;
      const fgLen = buildMonochromeSequences(next.neutralSeed, theme).foreground.length;
      const bgLen = buildMonochromeSequences(next.neutralSeed, theme).background.length;
      const primaryLen = buildPrimarySequence(next.primarySeed).length;
      const clamped: ThemeSettings = {
        ...next,
        bgIndex: clampSequenceIndex(next.bgIndex, bgLen),
        fgIndex: clampSequenceIndex(next.fgIndex, fgLen),
        primaryIndex: clampSequenceIndex(next.primaryIndex, primaryLen),
      };
      const live = readSavedOverride("admin");
      const clampedPair = withShellThemeState(
        {
          ...pairFromSettings(clamped, theme),
          ...(live?.contrastByShell ? { contrastByShell: live.contrastByShell } : {}),
          ...(live?.primaryByShell ? { primaryByShell: live.primaryByShell } : {}),
        },
        theme,
        {
          bgIndex: clamped.bgIndex,
          fgIndex: clamped.fgIndex,
          ...(clamped.kind === "multicolor" ? { primaryIndex: clamped.primaryIndex } : {}),
        }
      );
      setSettings(clamped);
      applyDerivedTokens(clampedPair.bg, clampedPair.fg, clampedPair.neutral, clampedPair.kind, {
        neutralSeed: clampedPair.neutralSeed,
        primarySeed: clampedPair.primarySeed,
      });
      if (persist) saveOverride({ ...clampedPair, shell: theme }, "admin");
      if (syncShell) {
        /* Shell is only changed by Jasne/Ciemne — never infer from luminance. */
        document.documentElement.dataset.theme = theme;
      }
    },
    [theme]
  );

  const setKind = (kind: ThemeKind) => {
    if (kind === settings.kind) return;
    const nextSettings = { ...settings, kind };
    commitSettings(nextSettings);

    /* Clear palette selection on kind change unless a saved palette of the new
       kind already shares this exact neutral background + foreground. */
    const live = pairFromSettings(nextSettings, theme);
    const liveBg = normalizeHex(live.bg);
    const liveNeutral = normalizeHex(live.neutral ?? live.fg);
    const match =
      liveBg && liveNeutral
        ? savedThemes.find((t) => {
            if ((t.kind ?? "multicolor") !== kind) return false;
            const tPair = pairFromSettings(settingsFromPair(t, theme), theme);
            return (
              normalizeHex(tPair.bg) === liveBg &&
              normalizeHex(tPair.neutral ?? tPair.fg) === liveNeutral
            );
          })
        : undefined;
    rememberActivePalette(match?.id ?? null);
  };

  const reset = () => {
    clearSavedOverride("admin");
    commitSettings(canonicalThemeSettings(theme), { persist: false, syncShell: false });
  };

  const applySaved = (t: SavedTheme) => {
    rememberActivePalette(t.id);
    commitSettings(settingsFromPair(t, theme));
  };

  const addTheme = async () => {
    setPaletteBusy(true);
    setPaletteError(null);
    try {
      const derived = pairFromSettings(settings, theme);
      const live = readSavedOverride("admin");
      const themeCard: SavedTheme = {
        id: makeThemeId(),
        name: nextThemeName(savedThemes, settings.kind),
        ...derived,
        ...(live?.contrastByShell ? { contrastByShell: live.contrastByShell } : {}),
        ...(live?.primaryByShell ? { primaryByShell: live.primaryByShell } : {}),
        createdAt: Date.now(),
      };
      const next = await createPalette(themeCard);
      const list = next.length > 0 ? next : [...savedThemes, themeCard];
      const stored = list.find((p) => p.id === themeCard.id) ?? themeCard;
      setSavedThemes(list);
      rememberActivePalette(stored.id);
      setFocusPaletteId(stored.id);
      applySaved(stored);
    } catch (err) {
      setPaletteError(err instanceof Error ? err.message : "Could not save palette.");
    } finally {
      setPaletteBusy(false);
    }
  };

  const confirmDeleteSaved = async () => {
    if (!deleteTarget) return;
    setPaletteBusy(true);
    setPaletteError(null);
    try {
      setFocusPaletteId(null);
      const next = await deletePalette(deleteTarget.id);
      setSavedThemes(next);
      setDeleteTarget(null);
    } catch (err) {
      setPaletteError(err instanceof Error ? err.message : "Could not delete palette.");
    } finally {
      setPaletteBusy(false);
    }
  };

  const dialogHex =
    dialogTarget === "primary" ? settings.primarySeed : settings.neutralSeed;
  const dialogTitle =
    dialogTarget === "primary" ? "Set primary color" : "Set neutral color";

  return (
    <section className="contrast-checker contrast-checker--flow" aria-label="Theme colour settings">
      <section className="cc-section cc-neutral-frame" aria-labelledby="cc-neutral-title">
        <header className="cc-neutral-frame__header">
          <h3 className="cc-section__heading" id="cc-neutral-title">
            Neutral color
          </h3>
          <p className="cc-neutral-frame__subtitle">Set contrast of main frame</p>
        </header>

        <div className="cc-neutral-frame__body">
          <button
            type="button"
            className="cc-set-circle"
            onClick={() => setDialogTarget("neutral")}
            aria-label="Set neutral base color"
          >
            <span
              className="cc-set-circle__disc"
              style={{
                backgroundColor: neutralCircleFill,
                color: neutralCircleInk,
              }}
            >
              <SlidersIcon />
              <span className="cc-set-circle__label">Click &amp; set</span>
            </span>
          </button>

          <div className="cc-neutral-frame__sequences">
            <SequenceRow
              label="Foreground"
              sequence={foregroundSequence}
              selectedIndex={settings.fgIndex}
              seedIndex={neutralSeedIndex >= 0 ? neutralSeedIndex : -1}
              tokenRow="foreground"
              shell={theme}
              onSelect={(fgIndex) => {
                commitSettings({ ...settings, fgIndex });
              }}
            />
            <SequenceRow
              label="Background"
              sequence={backgroundSequence}
              selectedIndex={settings.bgIndex}
              seedIndex={-1}
              tokenRow="background"
              shell={theme}
              onSelect={(bgIndex) => {
                commitSettings({ ...settings, bgIndex });
              }}
            />
          </div>
        </div>
      </section>

      <section className="cc-section cc-section--field" aria-labelledby="cc-kind-title">
        <div className="form-field form-field--no-footer">
          <span className="form-field__label" id="cc-kind-title">
            Theme colors
          </span>
          <SegmentedControl
            size="sm"
            block
            aria-label="Theme colors"
            value={settings.kind}
            onChange={setKind}
            options={[
              { value: "monochrome", label: "Monochrome" },
              { value: "multicolor", label: "Multi-color" },
            ]}
          />
        </div>
      </section>

      {settings.kind === "multicolor" ? (
        <section className="cc-section cc-neutral-frame" aria-labelledby="cc-primary-title">
          <header className="cc-neutral-frame__header">
            <h3 className="cc-section__heading" id="cc-primary-title">
              Primary color
            </h3>
            <p className="cc-neutral-frame__subtitle">Set accent</p>
          </header>

          <div className="cc-neutral-frame__body">
            <button
              type="button"
              className="cc-set-circle"
              onClick={() => setDialogTarget("primary")}
              aria-label="Set primary base color"
            >
              <span
                className="cc-set-circle__disc"
                style={{
                  backgroundColor: primaryCircleFill,
                  color: primaryCircleInk,
                }}
              >
                <SlidersIcon />
                <span className="cc-set-circle__label">Click &amp; set</span>
              </span>
            </button>

            <div className="cc-neutral-frame__sequences">
              <SequenceRow
                label="Primary color"
                sequence={primarySequence}
                selectedIndex={settings.primaryIndex}
                seedIndex={primarySeedIndex >= 0 ? primarySeedIndex : -1}
                tokenRow="primary"
                shell={theme}
                onSelect={(primaryIndex) => commitSettings({ ...settings, primaryIndex })}
              />
              {primaryA11y ? (
                <PrimaryAccessibilityHints
                  activeShell={theme}
                  light={primaryA11y.light}
                  dark={primaryA11y.dark}
                  seedBlocked={primaryA11y.seedBlocked}
                  blockMessage={primaryA11y.blockMessage}
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="cc-section cc-section--action">
        <button type="button" className="cc-btn-action cc-btn-action--secondary" onClick={reset}>
          Reset to theme
        </button>
      </section>

      <section className="cc-section cc-section--live" aria-labelledby="cc-live-title">
        <h3 className="cc-section__heading" id="cc-live-title">
          Live preview - real component
        </h3>
        <div className="cc-live">
          <div className="cc-live__card">
            <div className="cc-live__chrome">
              <span className="cc-live__dash" aria-hidden>
                −
              </span>
              <span className="cc-live__title">Title</span>
              <span className="cc-live__info" aria-hidden>
                i
              </span>
            </div>
            <Select
              size="small"
              label="Select-Field"
              value="a"
              onChange={() => undefined}
              options={[
                { value: "a", label: "Choose an option" },
                { value: "b", label: "Option B" },
              ]}
            />
            <p className="cc-live__copy">
              This is a paragraph of some explanatory text that explain the specific feature of the
              UI ...
            </p>
            <div className="cc-live__actions">
              <Button variant="secondary" size="sm">
                Secondary action
              </Button>
              <Button variant="primary" size="sm">
                Primary action
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="cc-section cc-section--saved" aria-labelledby="cc-saved-title">
        <header className="cc-saved__header">
          <div className="cc-saved__title-row">
            <h3 className="cc-saved__title" id="cc-saved-title">
              Palety
            </h3>
            <Button
              variant="secondary"
              size="sm"
              className="cc-saved__add"
              disabled={paletteBusy}
              onClick={() => void addTheme()}
            >
              <PlusIcon />
              Dodaj
            </Button>
          </div>
          {paletteError ? <p className="cc-saved__error">{paletteError}</p> : null}
        </header>

        <PaletteCarousel
          label="Jednobarwne"
          items={monochromePalettes}
          theme={theme}
          settings={settings}
          activePaletteId={activePaletteId}
          focusId={
            monochromePalettes.some((p) => p.id === focusPaletteId) ? focusPaletteId : null
          }
          busy={paletteBusy}
          onApply={applySaved}
          onDelete={setDeleteTarget}
        />

        <PaletteCarousel
          label="Wielobarwne"
          items={multicolorPalettes}
          theme={theme}
          settings={settings}
          activePaletteId={activePaletteId}
          focusId={
            multicolorPalettes.some((p) => p.id === focusPaletteId) ? focusPaletteId : null
          }
          busy={paletteBusy}
          onApply={applySaved}
          onDelete={setDeleteTarget}
        />
      </section>

      <ThemeSetColorDialog
        open={dialogTarget != null}
        title={dialogTitle}
        hex={dialogHex}
        rampLabel={dialogTarget === "primary" ? "Primary seed" : "Neutral seed"}
        validateHex={dialogTarget === "primary" ? validatePrimarySeed : undefined}
        onClose={() => setDialogTarget(null)}
        onChange={(hex) => {
          if (dialogTarget === "primary") {
            const sequence = buildPrimarySequence(hex);
            commitSettings({
              ...settings,
              primarySeed: hex,
              primaryIndex: findPrimarySeedIndex(hex, sequence),
            });
            return;
          }
          commitSettings({ ...settings, neutralSeed: hex });
        }}
      />

      <DeletePaletteDialog
        open={deleteTarget != null}
        paletteName={deleteTarget?.name ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteSaved()}
      />
    </section>
  );
}
