import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, SegmentedControl } from "@cartography-lab/ui";
import { useScrollEdgeChrome } from "../../hooks/useScrollEdgeChrome";
import type { Theme } from "../../types/theme";

interface ThemeFlowOverlayProps {
  open: boolean;
  title?: string;
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  showShellToggle?: boolean;
  children: ReactNode;
}

const OPEN_MS = 350;
const CLOSE_MS = 280;

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
  const closeTimer = useRef<number | null>(null);
  const openRaf = useRef<number | null>(null);
  const wasOpen = useRef(false);

  const [settled, setSettled] = useState(false);

  useScrollEdgeChrome(modalRef, open && settled);

  /* Init parked state once shell exists. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.classList.add("modal-shell--offscreen", "modal-shell--no-transition");
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    const shell = shellRef.current;
    if (!overlay || !shell) return;

    const clearCloseTimer = () => {
      if (closeTimer.current != null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
    const clearOpenRaf = () => {
      if (openRaf.current != null) {
        cancelAnimationFrame(openRaf.current);
        openRaf.current = null;
      }
    };

    if (open) {
      clearCloseTimer();
      clearOpenRaf();
      setSettled(false);

      shell.classList.remove("modal-shell--closing");
      shell.classList.add("modal-shell--offscreen", "modal-shell--no-transition");

      overlay.classList.remove("modal-overlay--closing");
      overlay.classList.add("modal-overlay--active");
      document.body.classList.add("body--theme-flow-open");

      /* Double rAF: paint parked shell, then enable transition + slide up. */
      openRaf.current = requestAnimationFrame(() => {
        openRaf.current = requestAnimationFrame(() => {
          openRaf.current = null;
          shell.classList.remove("modal-shell--no-transition");
          void shell.offsetHeight;
          shell.classList.remove("modal-shell--offscreen");
          window.setTimeout(() => {
            setSettled(true);
            closeBtnRef.current?.focus();
          }, OPEN_MS);
        });
      });

      wasOpen.current = true;
      return () => {
        clearOpenRaf();
      };
    }

    /* Close only if we were open (skip initial mount). */
    if (!wasOpen.current && !overlay.classList.contains("modal-overlay--active")) {
      return;
    }

    clearOpenRaf();
    setSettled(false);
    overlay.classList.add("modal-overlay--closing");
    shell.classList.remove("modal-shell--offscreen", "modal-shell--no-transition");
    shell.classList.add("modal-shell--closing");

    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      overlay.classList.remove("modal-overlay--active", "modal-overlay--closing");
      shell.classList.remove("modal-shell--closing");
      shell.classList.add("modal-shell--offscreen", "modal-shell--no-transition");
      document.body.classList.remove("body--theme-flow-open");
      wasOpen.current = false;
    }, CLOSE_MS);

    return () => clearCloseTimer();
  }, [open]);

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
    onConfirm?.();
    onClose();
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
          <header className="modal__nav modal__nav--stacked" data-scroll-edge-nav>
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              className="modal__close"
              aria-label="Close theme"
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
                aria-label="Light or dark theme"
                value={theme}
                onChange={onThemeChange}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </div>
          ) : null}
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
