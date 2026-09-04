import type { ReactNode } from "react";
import { IconButton } from "@cartography-lab/ui";
import { usePostHog } from "@posthog/react";

type AppChromeProps = {
  title: string;
  onThemeOpen: () => void;
  children: ReactNode;
};

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppChrome({ title, onThemeOpen, children }: AppChromeProps) {
  const posthog = usePostHog();

  return (
    <div className="app-chrome">
      <header className="app-chrome__bar">
        <IconButton
          size="sm"
          className="app-chrome__menu-btn"
          aria-label="Open settings"
          onClick={() => {
            posthog?.capture("settings_opened");
            onThemeOpen();
          }}
        >
          <MenuIcon />
        </IconButton>
        <h1 className="app-chrome__title type-md type-medium type-trim">{title}</h1>
        <span className="app-chrome__bar-spacer" aria-hidden />
      </header>

      <div className="app-chrome__content">{children}</div>
    </div>
  );
}
