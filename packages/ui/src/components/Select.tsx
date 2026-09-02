import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  /** Type=Small — compact control for dense / floating menus */
  size?: "default" | "small";
}

const SHEET_GAP = 8;
const SHEET_MARGIN = 8;
const CLOSE_MS = 280;

/**
 * Select field with anchored form-sheet menu.
 * Native <select> is display-only; opening uses an anchored contextual menu
 * (desktop pop-up matching trigger width, slide + scrim transitions).
 */
export function Select({
  label,
  value,
  onChange,
  options,
  id,
  size = "default",
}: SelectProps) {
  const reactId = useId();
  const selectId = id ?? `select-${reactId}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const closingTimer = useRef<number | null>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  const sizeClass = size === "small" ? " form-field--small" : "";

  const positionPanel = useCallback(() => {
    const dialog = dialogRef.current;
    const anchor = wrapRef.current;
    if (!dialog || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(1, Math.round(rect.width));
    let left = Math.round(rect.left);
    if (left + width > vw - SHEET_MARGIN) left = Math.max(SHEET_MARGIN, vw - SHEET_MARGIN - width);
    if (left < SHEET_MARGIN) left = SHEET_MARGIN;

    const maxHGlobal = Math.min(vh * 0.7, 32 * 16);
    const spaceBelow = vh - rect.bottom - SHEET_MARGIN - SHEET_GAP;
    const spaceAbove = rect.top - SHEET_MARGIN - SHEET_GAP;
    const placeBelow = spaceBelow >= spaceAbove;

    dialog.style.setProperty("--form-sheet-panel-width", `${width}px`);
    dialog.style.setProperty("--form-sheet-panel-left", `${left}px`);

    if (placeBelow) {
      const top = rect.bottom + SHEET_GAP;
      const maxHb = Math.min(maxHGlobal, Math.max(0, vh - top - SHEET_MARGIN));
      setPlacement("below");
      dialog.style.setProperty("--form-sheet-panel-top", `${Math.round(top)}px`);
      dialog.style.removeProperty("--form-sheet-panel-bottom");
      dialog.style.setProperty("--form-sheet-panel-max-height", `${Math.round(maxHb)}px`);
    } else {
      const maxHt = Math.min(maxHGlobal, Math.max(0, spaceAbove));
      const bottom = vh - rect.top + SHEET_GAP;
      setPlacement("above");
      dialog.style.setProperty("--form-sheet-panel-bottom", `${Math.round(bottom)}px`);
      dialog.style.removeProperty("--form-sheet-panel-top");
      dialog.style.setProperty("--form-sheet-panel-max-height", `${Math.round(maxHt)}px`);
    }

    const list = listRef.current;
    if (list) {
      requestAnimationFrame(() => {
        list.dataset.fsScroll =
          list.scrollHeight > list.clientHeight + 2 ? "on" : "off";
      });
    }
  }, []);

  const requestClose = useCallback(() => {
    if (!open || closing) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOpen(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    if (closingTimer.current) window.clearTimeout(closingTimer.current);
    closingTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closingTimer.current = null;
    }, CLOSE_MS);
  }, [open, closing]);

  const openMenu = useCallback(() => {
    if (closingTimer.current) {
      window.clearTimeout(closingTimer.current);
      closingTimer.current = null;
    }
    setClosing(false);
    setOpen(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    positionPanel();
  }, [open, positionPanel, options.length]);

  useEffect(() => {
    if (!open) {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      return;
    }
    const onResize = () => positionPanel();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, positionPanel]);

  useEffect(() => {
    return () => {
      if (closingTimer.current) window.clearTimeout(closingTimer.current);
    };
  }, []);

  function pick(next: string) {
    onChange(next);
    requestClose();
  }

  const menu = open
    ? createPortal(
        <dialog
          ref={dialogRef}
          className={`form-sheet${closing ? " form-sheet--closing" : ""}`}
          data-form-sheet-anchored="true"
          data-form-sheet-placement={placement}
          data-form-sheet-type="select"
          aria-label={label}
          onCancel={(e) => {
            e.preventDefault();
            requestClose();
          }}
          onClick={(e) => {
            if (e.target === dialogRef.current) requestClose();
          }}
        >
          <div className="form-sheet__panel">
            <div className="form-sheet__masthead-desktop" aria-hidden="true">
              <p className="form-sheet__heading-display-desktop">{label}</p>
            </div>
            <div
              ref={listRef}
              className="form-sheet__list"
              role="listbox"
              aria-label={label}
              data-fs-scroll="off"
            >
              {options.map((opt) => {
                const selected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`form-sheet__row form-sheet__row--country${selected ? " form-sheet__row--selected" : ""}`}
                    onClick={() => pick(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </dialog>,
        document.body
      )
    : null;

  return (
    <>
      <div className={`form-field ${sizeClass}`.trim()}>
        <span className="form-field__label" id={`${selectId}-label`}>
          {label}
        </span>
        <div className="form-field__select-wrap" ref={wrapRef}>
          <button
            type="button"
            id={selectId}
            className="form-field__select form-field__select--trigger"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-labelledby={`${selectId}-label`}
            onClick={openMenu}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openMenu();
              }
            }}
          >
            <span className="form-field__select-value">{selectedLabel}</span>
          </button>
          <span className="form-field__select-icon" aria-hidden>
            <svg
              className="form-field__select-chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
      {menu}
    </>
  );
}
