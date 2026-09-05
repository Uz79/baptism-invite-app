import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, SegmentedControl } from "@cartography-lab/ui";
import { useScrollEdgeChrome } from "../../hooks/useScrollEdgeChrome";
import { useSlideUpOverlay } from "../../hooks/useSlideUpOverlay";
import type { Theme } from "../../types/theme";

interface ThemeFlowOverlayProps {
  open: boolean;
  title?: string;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  showShellToggle?: boolean;
  children: ReactNode;
}

/**
 * Banking payment-flow open/close:
 * - Overlay stays mounted (no remount jank)
 * - Scrim fades via ::before
 * - Shell parks offscreen with transition disabled, then slides up
 * - Animation classes are applied imperatively so React re-renders
 *   (theme token updates) cannot reset transform mid-flight
 */
export function ThemeFlowOverlay({
  open,
  title = "Theme",
  theme,
  onThemeChange,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  confirmDisabled = false,
  showShellToggle = true,
  children,
}: ThemeFlowOverlayProps) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const settled = useSlideUpOverlay({
    open,
    overlayRef,
    shellRef,
    onSettled: () => {
      /* Keyboard / fine pointer only — a mobile focus ring clips at the edge. */
      const finePointer =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (finePointer) closeBtnRef.current?.focus();
    },
  });

  useScrollEdgeChrome(modalRef, open && settled);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    void Promise.resolve(onConfirm?.())
      .then(() => {
        onClose();
      })
      .catch(() => {
        /* Caller surfaces the error; keep the sheet open. */
      });
  };

  return (
    <div
      ref={overlayRef}
      className="modal-overlay modal-overlay--theme-flow"
      role="presentation"
      onMouseDown={(e) => {
        if (!open) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={shellRef}
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
      >
        <div className="modal modal--theme-flow" ref={modalRef}>
          <div className="modal__chrome" data-scroll-edge-nav>
            <header className="modal__nav modal__nav--stacked">
              <span className="modal__nav-spacer" aria-hidden />
              <h2 className="modal__title type-lg type-medium type-trim" id={titleId}>
                {title}
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="modal__close"
                aria-label="Zamknij"
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
            {showShellToggle && theme && onThemeChange ? (
              <div className="modal__shell-toggle-row">
                <SegmentedControl
                  size="sm"
                  block
                  className="modal__theme-toggle"
                  aria-label="Motyw jasny lub ciemny"
                  value={theme}
                  onChange={onThemeChange}
                  options={[
                    { value: "light", label: "Jasne" },
                    { value: "dark", label: "Ciemne" },
                  ]}
                />
              </div>
            ) : null}
          </div>
          <div className="modal__body modal__body--theme-flow" data-scroll-edge>
            <div data-scroll-edge-content>{children}</div>
          </div>
          <footer className="modal__footer" data-scroll-edge-footer>
            <Button
              variant="primary"
              size="md"
              className="uz-btn--block"
              type="button"
              disabled={confirmDisabled}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
