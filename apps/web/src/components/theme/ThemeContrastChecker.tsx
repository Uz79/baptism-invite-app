import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Select, SegmentedControl } from "@cartography-lab/ui";
import { ThemeSetColorDialog } from "./ThemeSetColorDialog";
import { DeletePaletteDialog } from "./DeletePaletteDialog";
import type { Theme } from "../../types/theme";
import { createPalette, deletePalette, fetchPalettes } from "../../lib/palettesApi";
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
  pairFromSettings,
  pickInvertedInk,
  readCanonicalFromTheme,
  readSavedOverride,
  saveOverride,
  settingsFromPair,
  shellThemeFromPair,
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

export function ThemeContrastChecker({
  theme,
  onThemeChange,
  syncKey,
}: ThemeContrastCheckerProps) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = readSavedOverride();
    const base = saved ?? readCanonicalFromTheme(theme);
    return settingsFromPair(base, theme);
  });
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedTheme | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const [paletteBusy, setPaletteBusy] = useState(false);

  const syncFromLive = useCallback(() => {
    const saved = readSavedOverride();
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
        if (!cancelled) setSavedThemes(list);
      })
      .catch(() => {
        if (!cancelled) setPaletteError("Could not load shared palettes.");
      });
    return () => {
      cancelled = true;
    };
  }, [syncKey]);

  const visiblePalettes = useMemo(
    () => savedThemes.filter((t) => (t.kind ?? "multicolor") === settings.kind),
    [savedThemes, settings.kind]
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
    const saved = readSavedOverride();
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
      const live = readSavedOverride();
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
      if (persist) saveOverride(clampedPair);
      if (syncShell) {
        const shell = shellThemeFromPair(clampedPair.bg, clampedPair.fg);
        if (shell !== theme) onThemeChange(shell);
        else document.documentElement.dataset.theme = shell;
      }
    },
    [onThemeChange, theme]
  );

  const setKind = (kind: ThemeKind) => {
    if (kind === settings.kind) return;
    commitSettings({ ...settings, kind });
  };

  const reset = () => {
    clearSavedOverride();
    commitSettings(canonicalThemeSettings(theme), { persist: false, syncShell: false });
  };

  const addTheme = async () => {
    setPaletteBusy(true);
    setPaletteError(null);
    try {
      const derived = pairFromSettings(settings, theme);
      const live = readSavedOverride();
      const themeCard: SavedTheme = {
        id: makeThemeId(),
        name: nextThemeName(savedThemes),
        ...derived,
        ...(live?.contrastByShell ? { contrastByShell: live.contrastByShell } : {}),
        ...(live?.primaryByShell ? { primaryByShell: live.primaryByShell } : {}),
        createdAt: Date.now(),
      };
      const next = await createPalette(themeCard);
      setSavedThemes(next);
    } catch (err) {
      setPaletteError(err instanceof Error ? err.message : "Could not save palette.");
    } finally {
      setPaletteBusy(false);
    }
  };

  const applySaved = (t: SavedTheme) => {
    commitSettings(settingsFromPair(t, theme));
  };

  const confirmDeleteSaved = async () => {
    if (!deleteTarget) return;
    setPaletteBusy(true);
    setPaletteError(null);
    try {
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
          <h3 className="cc-saved__title" id="cc-saved-title">
            Palety
          </h3>
          <p className="cc-saved__subtitle">
            {settings.kind === "monochrome" ? "Jednobarwne" : "Wielobarwne"} — save themes guests can
            choose from.
          </p>
          {paletteError ? <p className="cc-saved__error">{paletteError}</p> : null}
        </header>
        <div className="cc-saved__grid" role="list" aria-label="Saved palettes list">
          <button
            type="button"
            className="cc-theme-card cc-theme-card--add"
            role="listitem"
            disabled={paletteBusy}
            onClick={() => void addTheme()}
          >
            <span className="cc-theme-card__plus" aria-hidden>
              <PlusIcon />
            </span>
            <span className="cc-theme-card__label">+ Dodaj</span>
          </button>
          {visiblePalettes.map((t) => {
            const tSettings = settingsFromPair(t, theme);
            const tPair = pairFromSettings(tSettings, theme);
            const selected =
              tSettings.kind === settings.kind &&
              tSettings.neutralSeed === settings.neutralSeed &&
              tSettings.primarySeed === settings.primarySeed &&
              tSettings.bgIndex === settings.bgIndex &&
              tSettings.fgIndex === settings.fgIndex &&
              tSettings.primaryIndex === settings.primaryIndex;
            return (
              <div
                key={t.id}
                className={`cc-theme-card${selected ? " cc-theme-card--selected" : ""}`}
                role="listitem"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => applySaved(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    applySaved(t);
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
                      disabled={paletteBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(t);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </span>
                <span className="cc-theme-card__row">
                  <span className="cc-theme-card__swatch" style={{ background: tPair.bg }} aria-hidden />
                  <span className="cc-theme-card__row-label">Background</span>
                </span>
                <span className="cc-theme-card__row">
                  <span
                    className="cc-theme-card__swatch"
                    style={{ background: tPair.neutral ?? tPair.fg }}
                    aria-hidden
                  />
                  <span className="cc-theme-card__row-label">Foreground</span>
                </span>
                {tSettings.kind === "multicolor" ? (
                  <span className="cc-theme-card__row">
                    <span
                      className="cc-theme-card__swatch"
                      style={{ background: tPair.fg }}
                      aria-hidden
                    />
                    <span className="cc-theme-card__row-label">Primary</span>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
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
