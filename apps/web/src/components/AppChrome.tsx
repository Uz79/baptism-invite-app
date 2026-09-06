import { useRef, type ReactNode } from "react";
import { IconButton } from "@cartography-lab/ui";
import { usePostHog } from "@posthog/react";
import { useStickyBarScrollEdge } from "../hooks/useStickyBarScrollEdge";

type AppChromeProps = {
  title: string;
  onThemeOpen: () => void;
  children: ReactNode;
};

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  const barRef = useRef<HTMLElement>(null);
  useStickyBarScrollEdge(barRef);

  return (
    <div className="app-chrome">
      <header ref={barRef} className="app-chrome__bar" data-scroll-edge-nav>
        <IconButton
          size="sm"
          className="app-chrome__menu-btn"
          aria-label="Otwórz ustawienia"
          onClick={() => {
            posthog?.capture("settings_opened");
            onThemeOpen();
          }}
        >
          <MenuIcon />
        </IconButton>
        <h1 className="app-chrome__title type-lg type-medium type-trim">{title}</h1>
        <span className="app-chrome__bar-spacer" aria-hidden />
      </header>

      <div className="app-chrome__content">{children}</div>
    </div>
  );
}
