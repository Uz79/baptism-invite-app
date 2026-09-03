import { useEffect, useMemo, useState } from "react";
import {
  pairFromSettings,
  settingsFromPair,
  type SavedTheme,
  type ThemeMode,
} from "../../lib/themeColors";
import { fetchPalettes } from "../../lib/palettesApi";
import { getGuestPaletteId } from "../../lib/access";

type GuestThemePickerProps = {
  theme: ThemeMode;
  selectedId: string | null;
  onSelect: (palette: SavedTheme) => void;
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

  return (
    <button
      type="button"
      className={`cc-theme-card${selected ? " cc-theme-card--selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="cc-theme-card__header">
        <span className="cc-theme-card__title">{palette.name}</span>
        {selected ? (
          <span className="cc-theme-card__check" aria-hidden>
            ✓
          </span>
        ) : null}
      </span>
      <span className="cc-theme-card__row">
        <span className="cc-theme-card__swatch" style={{ background: pair.bg }} aria-hidden />
        <span className="cc-theme-card__row-label">Tło</span>
      </span>
      <span className="cc-theme-card__row">
        <span
          className="cc-theme-card__swatch"
          style={{ background: pair.neutral ?? pair.fg }}
          aria-hidden
        />
        <span className="cc-theme-card__row-label">Pierwszy plan</span>
      </span>
      {kind === "multicolor" ? (
        <span className="cc-theme-card__row">
          <span className="cc-theme-card__swatch" style={{ background: pair.fg }} aria-hidden />
          <span className="cc-theme-card__row-label">Akcent</span>
        </span>
      ) : null}
    </button>
  );
}

export function GuestThemePicker({ theme, selectedId, onSelect }: GuestThemePickerProps) {
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
        const remembered = getGuestPaletteId();
        if (!selectedId && remembered) {
          const hit = list.find((p) => p.id === remembered);
          if (hit) onSelect(hit);
        }
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
    // intentionally only on mount / theme open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {error ? <p className="guest-theme-picker__status guest-theme-picker__status--error">{error}</p> : null}

      <section className="cc-section cc-section--saved" aria-labelledby="guest-mono-title">
        <header className="cc-saved__header">
          <h3 className="cc-saved__title" id="guest-mono-title">
            Jednobarwne
          </h3>
        </header>
        <div className="cc-saved__grid" role="list">
          {mono.map((palette) => (
            <div key={palette.id} role="listitem">
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

      <section className="cc-section cc-section--saved" aria-labelledby="guest-multi-title">
        <header className="cc-saved__header">
          <h3 className="cc-saved__title" id="guest-multi-title">
            Wielobarwne
          </h3>
        </header>
        <div className="cc-saved__grid" role="list">
          {multi.map((palette) => (
            <div key={palette.id} role="listitem">
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
