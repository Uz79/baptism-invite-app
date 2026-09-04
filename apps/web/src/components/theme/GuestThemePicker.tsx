import { useEffect, useMemo, useState } from "react";
import {
  pairFromSettings,
  settingsFromPair,
  type SavedTheme,
  type ThemeMode,
} from "../../lib/themeColors";
import { fetchPalettes } from "../../lib/palettesApi";

type GuestThemePickerProps = {
  theme: ThemeMode;
  selectedId: string | null;
  onSelect: (palette: SavedTheme) => void;
  /** Bumped each time the sheet opens, so the shared list is refetched. */
  syncKey?: number;
};

function PaletteCard({
  palette,
  theme,
  selected,
  onSelect,
}: {
  palette: SavedTheme;
  theme: ThemeMode;
  selected: boolean;
  onSelect: () => void;
}) {
  const pair = pairFromSettings(settingsFromPair(palette, theme), theme);
  const kind = palette.kind ?? "multicolor";
  const foreground = pair.neutral ?? pair.fg;
  const background = pair.bg;
  const primary = pair.fg;

  return (
    <button
      type="button"
      className={`guest-palette-card${selected ? " guest-palette-card--selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="guest-palette-card__title">{palette.name}</span>
      <span className="guest-palette-card__row">
        <span
          className="guest-palette-card__swatch guest-palette-card__swatch--fg"
          style={{ background: foreground }}
          aria-hidden
        />
        <span className="guest-palette-card__label">Pierwszy plan</span>
      </span>
      <span className="guest-palette-card__row">
        <span
          className="guest-palette-card__swatch guest-palette-card__swatch--fg"
          style={{ background: background }}
          aria-hidden
        />
        <span className="guest-palette-card__label">Tło</span>
      </span>
      {kind === "multicolor" ? (
        <span className="guest-palette-card__row">
          <span
            className="guest-palette-card__swatch guest-palette-card__swatch--fg"
            style={{ background: primary }}
            aria-hidden
          />
          <span className="guest-palette-card__label">Podstawowy</span>
        </span>
      ) : null}
    </button>
  );
}

export function GuestThemePicker({
  theme,
  selectedId,
  onSelect,
  syncKey = 0,
}: GuestThemePickerProps) {
  const [palettes, setPalettes] = useState<SavedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPalettes()
      .then((list) => {
        if (cancelled) return;
        setPalettes(list);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Nie udało się wczytać palet.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    /* Refetch on every open: the overlay keeps this component mounted, so
       without syncKey a guest would keep seeing the list from their first
       open and never pick up palettes the owner added since. */
  }, [syncKey]);

  const mono = useMemo(
    () => palettes.filter((p) => (p.kind ?? "multicolor") === "monochrome"),
    [palettes]
  );
  const multi = useMemo(
    () => palettes.filter((p) => (p.kind ?? "multicolor") === "multicolor"),
    [palettes]
  );

  return (
    <section className="guest-theme-picker" aria-label="Wybór kolorów">
      {loading ? <p className="guest-theme-picker__status">Ładowanie palet…</p> : null}
      {error ? (
        <p className="guest-theme-picker__status guest-theme-picker__status--error">{error}</p>
      ) : null}

      <section className="guest-theme-picker__group" aria-labelledby="guest-mono-title">
        <h3 className="guest-theme-picker__heading" id="guest-mono-title">
          Jednobarwne
        </h3>
        <div className="palette-carousel" role="list">
          {mono.map((palette) => (
            <div key={palette.id} className="palette-carousel__item" role="listitem">
              <PaletteCard
                palette={palette}
                theme={theme}
                selected={selectedId === palette.id}
                onSelect={() => onSelect(palette)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="guest-theme-picker__group" aria-labelledby="guest-multi-title">
        <h3 className="guest-theme-picker__heading" id="guest-multi-title">
          Wielobarwne
        </h3>
        <div className="palette-carousel" role="list">
          {multi.map((palette) => (
            <div key={palette.id} className="palette-carousel__item" role="listitem">
              <PaletteCard
                palette={palette}
                theme={theme}
                selected={selectedId === palette.id}
                onSelect={() => onSelect(palette)}
              />
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
