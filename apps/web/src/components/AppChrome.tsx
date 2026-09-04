import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { IconButton } from "@cartography-lab/ui";
import { usePostHog } from "@posthog/react";

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

/** Banking-style shadow under the sticky bar once content scrolls beneath it. */
function useStickyBarScrollEdge(barRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const overflows = document.documentElement.scrollHeight - window.innerHeight > 1;
      const scrolled = window.scrollY > 1;
      bar.classList.toggle("is-scroll-edge--after", overflows && scrolled);
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(document.documentElement);

    update();
    requestAnimationFrame(update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro?.disconnect();
      bar.classList.remove("is-scroll-edge--after");
    };
  }, [barRef]);
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
        <h1 className="app-chrome__title type-md type-medium type-trim">{title}</h1>
        <span className="app-chrome__bar-spacer" aria-hidden />
      </header>

      <div className="app-chrome__content">{children}</div>
    </div>
  );
}
