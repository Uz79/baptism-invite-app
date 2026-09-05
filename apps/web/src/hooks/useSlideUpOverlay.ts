import { useEffect, useRef, useState, type RefObject } from "react";

export const OVERLAY_OPEN_MS = 350;
export const OVERLAY_CLOSE_MS = 280;

type Options = {
  open: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  shellRef: RefObject<HTMLDivElement | null>;
  /** Class toggled on <body> while the overlay is up (scroll lock). */
  bodyClass?: string;
  /** Runs once the slide-up has settled — e.g. to move focus. */
  onSettled?: () => void;
};

/**
 * Banking payment-flow open/close choreography, shared by every slide-up
 * surface so they all move identically:
 *  - the overlay stays mounted (no remount jank)
 *  - the scrim fades via ::before
 *  - the shell parks offscreen with transition disabled, then slides up
 *  - classes are applied imperatively, so a React re-render (a theme token
 *    change, say) cannot reset the transform mid-flight
 *
 * Returns `settled`, true once the opening transition has finished.
 */
export function useSlideUpOverlay({
  open,
  overlayRef,
  shellRef,
  bodyClass = "body--theme-flow-open",
  onSettled,
}: Options): boolean {
  const closeTimer = useRef<number | null>(null);
  const openRaf = useRef<number | null>(null);
  const wasOpen = useRef(false);
  const settledCb = useRef(onSettled);
  settledCb.current = onSettled;

  const [settled, setSettled] = useState(false);

  /* Park the shell offscreen once it exists. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.classList.add("modal-shell--offscreen", "modal-shell--no-transition");
  }, [shellRef]);

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
      document.body.classList.add(bodyClass);

      /* Double rAF: paint the parked shell, then enable transition + slide up. */
      openRaf.current = requestAnimationFrame(() => {
        openRaf.current = requestAnimationFrame(() => {
          openRaf.current = null;
          shell.classList.remove("modal-shell--no-transition");
          void shell.offsetHeight;
          shell.classList.remove("modal-shell--offscreen");
          window.setTimeout(() => {
            setSettled(true);
            settledCb.current?.();
          }, OVERLAY_OPEN_MS);
        });
      });

      wasOpen.current = true;
      return () => clearOpenRaf();
    }

    /* Close only if we were open (skip the initial mount). */
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
      document.body.classList.remove(bodyClass);
      wasOpen.current = false;
    }, OVERLAY_CLOSE_MS);

    return () => clearCloseTimer();
  }, [open, overlayRef, shellRef, bodyClass]);

  return settled;
}
