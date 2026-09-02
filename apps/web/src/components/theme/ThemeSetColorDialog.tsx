import { useEffect, useMemo, useRef, useState } from "react";
import { Button, TextField } from "@cartography-lab/ui";
import {
  buildSeedRamp,
  contrastOnSwatch,
  hexToRgb,
  hsvToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
  type Hsv,
  type WcagChecks,
} from "../../lib/themeColors";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function sliderProgress(min: number, max: number, value: number): string {
  return `${((value - min) / (max - min)) * 100}%`;
}

function MinusSmallIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusSmallIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WcagBadges({ checks }: { checks: WcagChecks }) {
  return (
    <div className="cc-badge-stack" role="status" aria-live="polite">
      {(
        [
          ["AA Large", checks.aaLarge],
          ["AAA Large", checks.aaaLarge],
          ["AA Normal", checks.aaNormal],
          ["AAA Normal", checks.aaaNormal],
        ] as const
      ).map(([label, pass]) => (
        <div className="cc-badge-labeled" key={label}>
          <span className={`cc-badge${pass ? " cc-badge--pass" : " cc-badge--fail"}`}>
            <span className="cc-badge-text">{pass ? "Pass" : "Fail"}</span>
            <span className="cc-badge-arrow" aria-hidden>
              →
            </span>
          </span>
          <span className="cc-badge-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ColorPickerPad({
  hue,
  s,
  v,
  onChange,
}: {
  hue: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    onChange(Math.round(x * 100), Math.round((1 - y) * 100));
  };

  return (
    <div
      ref={padRef}
      className="cc-sv-pad"
      style={{ background: `hsl(${hue} 100% 50%)` }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        setFromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      role="slider"
      aria-label="Saturation and lightness"
      aria-valuetext={`Saturation ${s}%, brightness ${v}%`}
      tabIndex={0}
    >
      <div className="cc-sv-pad__white" aria-hidden />
      <div className="cc-sv-pad__black" aria-hidden />
      <span
        className="cc-sv-pad__thumb"
        style={{ left: `${s}%`, top: `${100 - v}%` }}
        aria-hidden
      />
    </div>
  );
}

export interface ThemeSetColorDialogProps {
  open: boolean;
  title: string;
  hex: string;
  rampLabel: string;
  onClose: () => void;
  onChange: (hex: string) => void;
  /** When set, blocks apply and shows the message (primary seed guardrail). */
  validateHex?: (hex: string) => string | null;
}

export function ThemeSetColorDialog({
  open,
  title,
  hex,
  rampLabel,
  onClose,
  onChange,
  validateHex,
}: ThemeSetColorDialogProps) {
  const [hexDraft, setHexDraft] = useState(hex);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pickerHsv, setPickerHsv] = useState<Hsv>(() => {
    const rgb = hexToRgb(hex) ?? { r: 58, g: 61, b: 66 };
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setHexDraft(hex);
  }, [hex, open]);

  useEffect(() => {
    if (!open) setValidationError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const rgb = hexToRgb(hex) ?? { r: 58, g: 61, b: 66 };
    setPickerHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
  }, [hex, open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const rgb = useMemo(() => hexToRgb(hex) ?? { r: 58, g: 61, b: 66 }, [hex]);
  const swatch = contrastOnSwatch(hex);
  const ramp = useMemo(() => buildSeedRamp(hex), [hex]);

  const commitHex = (raw: string) => {
    const normalized = normalizeHex(raw);
    if (!normalized) {
      setHexDraft(hex);
      return;
    }
    const block = validateHex?.(normalized) ?? null;
    if (block) {
      setValidationError(block);
      return;
    }
    setValidationError(null);
    onChange(normalized);
  };

  const applyPickerHsv = (partial: { h?: number; s?: number; v?: number }) => {
    const next = { ...pickerHsv, ...partial };
    if (partial.h != null && next.s < 4) next.s = 8;
    setPickerHsv(next);
    const out = hsvToRgb(next.h, next.s, next.v);
    const nextHex = rgbToHex(out.r, out.g, out.b);
    const block = validateHex?.(nextHex) ?? null;
    if (block) {
      setValidationError(block);
      return;
    }
    setValidationError(null);
    onChange(nextHex);
  };

  const setRgb = (ch: "r" | "g" | "b", value: number) => {
    const base = { ...rgb, [ch]: value };
    const nextHex = rgbToHex(base.r, base.g, base.b);
    const block = validateHex?.(nextHex) ?? null;
    if (block) {
      setValidationError(block);
      return;
    }
    setValidationError(null);
    onChange(nextHex);
  };

  return (
    <dialog
      ref={dialogRef}
      className="cc-set-color-dialog"
      aria-labelledby="cc-set-color-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div
        className="cc-set-color-dialog__panel"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cc-set-color-dialog__header">
          <h3
            className="cc-set-color-dialog__title"
            id="cc-set-color-title"
            style={{ color: hex }}
          >
            {title}
          </h3>
          <button
            type="button"
            className="modal__close"
            aria-label="Close set color dialog"
            onClick={onClose}
          >
            <svg className="modal__close-icon" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="cc-set-color-dialog__body">
          <div className="cc-color-col__hero">
            <div
              className="cc-aa-swatch cc-aa-swatch--dialog"
              style={{ background: hex, color: swatch.ink }}
              aria-hidden
            >
              Aa
            </div>
            <span className="cc-contrast-ratio">{swatch.ratio.toFixed(2)}</span>
          </div>

          <div className="cc-audit">
            <p className="cc-audit__label">Contrast audit</p>
            <WcagBadges checks={swatch.checks} />
          </div>

          {validationError ? (
            <p className="cc-set-color-dialog__block" role="alert">
              {validationError}
            </p>
          ) : null}

          <TextField
            size="small"
            clearable
            className="cc-input-field"
            value={hexDraft}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
            onChange={(e) => {
              setHexDraft(e.target.value);
              const normalized = normalizeHex(e.target.value);
              if (!normalized) return;
              const block = validateHex?.(normalized) ?? null;
              if (block) {
                setValidationError(block);
                return;
              }
              setValidationError(null);
              onChange(normalized);
            }}
            onBlur={() => commitHex(hexDraft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHex(hexDraft);
            }}
            aria-label={`${title} hex`}
          />

          <div className="cc-picker-row">
            <div className="cc-picker-sv">
              <ColorPickerPad
                hue={pickerHsv.h}
                s={pickerHsv.s}
                v={pickerHsv.v}
                onChange={(s, v) => applyPickerHsv({ s, v })}
              />
              <input
                type="range"
                className="cc-hue-slider"
                min={0}
                max={360}
                value={pickerHsv.h}
                aria-label={`${title} hue`}
                onInput={(e) => applyPickerHsv({ h: Number(e.currentTarget.value) })}
                onChange={(e) => applyPickerHsv({ h: Number(e.currentTarget.value) })}
              />
            </div>

            <div className="cc-rgb-stack">
              {(
                [
                  ["r", "Red", rgb.r],
                  ["g", "Green", rgb.g],
                  ["b", "Blue", rgb.b],
                ] as const
              ).map(([ch, name, val]) => (
                <div className="cc-spin" key={ch}>
                  <span className="cc-spin__label">{name}</span>
                  <div className="cc-spin__controls">
                    <button
                      type="button"
                      className="cc-spin__btn"
                      aria-label={`Decrease ${name}`}
                      onClick={() => setRgb(ch, clamp(val - 1, 0, 255))}
                    >
                      <MinusSmallIcon />
                    </button>
                    <input
                      type="number"
                      className="cc-spin__input"
                      min={0}
                      max={255}
                      value={val}
                      aria-label={`${title} ${name}`}
                      onChange={(e) => setRgb(ch, clamp(Number(e.target.value) || 0, 0, 255))}
                    />
                    <button
                      type="button"
                      className="cc-spin__btn"
                      aria-label={`Increase ${name}`}
                      onClick={() => setRgb(ch, clamp(val + 1, 0, 255))}
                    >
                      <PlusSmallIcon />
                    </button>
                  </div>
                  <input
                    type="range"
                    className="cc-color-slider"
                    min={0}
                    max={255}
                    value={val}
                    aria-label={`${title} ${name} slider`}
                    style={{ ["--cc-progress" as string]: sliderProgress(0, 255, val) }}
                    onChange={(e) => setRgb(ch, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="cc-ramp">
            <p className="cc-ramp__label">{rampLabel}</p>
            <div className="cc-ramp__swatches" role="list">
              {ramp.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cc-ramp__chip${c.toLowerCase() === hex.toLowerCase() ? " cc-ramp__chip--active" : ""}`}
                  style={{ background: c }}
                  aria-label={`Use ${c}`}
                  role="listitem"
                  onClick={() => onChange(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="cc-set-color-dialog__footer">
          <Button
            variant="primary"
            size="md"
            type="button"
            className="uz-btn--block"
            onClick={() => {
              commitHex(hexDraft);
              onClose();
            }}
          >
            Confirm
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
