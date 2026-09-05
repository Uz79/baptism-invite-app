import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { SegmentedControl } from "@cartography-lab/ui";
import type { Theme } from "../../types/theme";
import { useSlideUpOverlay } from "../../hooks/useSlideUpOverlay";

/**
 * Admin chrome. Desktop (>=1024px) renders a persistent 256px sidebar;
 * mobile renders a top bar whose hamburger opens the same nav as a sheet.
 * Both are described in Figma as admin-menu-01 / admin-menu-02.
 */

function HomeIcon() {
  return (
    <svg className="sidebar__nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function StatsIcon() {
  return (
    <svg className="sidebar__nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 20V10M12 20V4m7 16v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ThemeIcon() {
  return (
    <svg className="sidebar__nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
type AdminShellProps = {
  children: ReactNode;
  title: string;
  onThemeOpen: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
};

export function AdminShell({ children, title, onThemeOpen, theme, onThemeChange }: AdminShellProps) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  /* Same slide-up choreography as the settings flow. */
  useSlideUpOverlay({ open: menuOpen, overlayRef, shellRef });

  /* Close the sheet on route change and on Escape. */
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const nav = (
    <nav className="sidebar__nav" aria-label="Admin navigation">
      <Link
        className={`sidebar__nav-item${pathname === "/" ? " sidebar__nav-item--active" : ""}`}
        to="/"
        aria-current={pathname === "/" ? "page" : undefined}
        /* Close on click, not on route change: tapping the item for the page
           you are already on leaves pathname untouched, so the effect below
           would never fire and the sheet would stay open. */
        onClick={() => setMenuOpen(false)}
      >
        <HomeIcon />
        <span>Main view</span>
      </Link>
      <Link
        className={`sidebar__nav-item${pathname === "/statistics" ? " sidebar__nav-item--active" : ""}`}
        to="/statistics"
        aria-current={pathname === "/statistics" ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
      >
        <StatsIcon />
        <span>Statistics</span>
      </Link>
      <button
        className="sidebar__nav-item"
        type="button"
        onClick={() => {
          setMenuOpen(false);
          onThemeOpen();
        }}
      >
        <ThemeIcon />
        <span>Theme setting</span>
      </button>
    </nav>
  );

  const themeToggle = (
    <div className="sidebar__footer">
      <SegmentedControl
        size="sm"
        block
        aria-label="Light or dark theme"
        value={theme}
        onChange={onThemeChange}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
      />
    </div>
  );

  return (
    <div className="admin-app">
      {/* Desktop rail */}
      <aside className="sidebar">
        <div className="sidebar__logo">Admin menu</div>
        {nav}
        {themeToggle}
      </aside>

      <div className="admin-body">
        {/* Mobile top bar */}
        <header className="admin-topbar">
          <button
            className="admin-topbar__menu"
            type="button"
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>
          <h1 className="admin-topbar__title">{title}</h1>
          <span className="admin-topbar__spacer" aria-hidden />
        </header>

        <main className="admin-main">
          <div className="admin-main__inner">{children}</div>
        </main>
      </div>

      {/* Mobile menu sheet — admin-menu-01 / 02.
          Always mounted: the open/close transition needs a stable node. */}
      <div
        ref={overlayRef}
        className="modal-overlay modal-overlay--admin-menu"
        role="presentation"
        onMouseDown={(e) => {
          if (!menuOpen) return;
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <div
          ref={shellRef}
          className="modal-shell"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          aria-hidden={!menuOpen}
        >
          <div className="modal modal--admin-menu">
            <header className="modal__nav">
              <h2 className="modal__title">Admin menu</h2>
              <button
                className="modal__close"
                type="button"
                aria-label="Close admin menu"
                onClick={() => setMenuOpen(false)}
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
            <div className="modal__body modal__body--admin-menu">{nav}</div>
            <footer className="modal__footer">{themeToggle}</footer>
          </div>
        </div>
      </div>
    </div>
  );
}
