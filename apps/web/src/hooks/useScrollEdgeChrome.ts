import { useEffect, type RefObject } from "react";

/**
 * Banking scroll-boundary indication (`scroll-edge-chrome.js`).
 * Toggles `is-scroll-edge--after` on nav and `is-scroll-edge--before` on footer
 * when the scrollport has content extending past the visible edge.
 */
export function useScrollEdgeChrome(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    const nav = root.querySelector<HTMLElement>(".modal__nav, [data-scroll-edge-nav]");
    const footer = root.querySelector<HTMLElement>(
      ".modal__footer, [data-scroll-edge-footer]",
    );

    let boundScrollEl: HTMLElement | null = null;
    let boundContentEl: Element | null = null;
    let contentObserver: ResizeObserver | null = null;

    const getScrollEl = () =>
      root.querySelector<HTMLElement>("[data-scroll-edge], [data-ai-scroll]");

    const scrollContentTarget = (scrollEl: HTMLElement) =>
      scrollEl.querySelector("[data-scroll-edge-content]") ||
      scrollEl.firstElementChild;

    const isFooterVisible = () => {
      if (!footer) return false;
      const cs = window.getComputedStyle(footer);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (cs.position === "fixed" || cs.position === "sticky") return true;
      return footer.offsetParent !== null;
    };

    const attachContentObserver = (scrollEl: HTMLElement) => {
      if (typeof ResizeObserver === "undefined") return;
      if (!contentObserver) {
        contentObserver = new ResizeObserver(() => update());
      }
      const contentEl = scrollContentTarget(scrollEl);
      if (contentEl === boundContentEl) return;
      if (boundContentEl) contentObserver.unobserve(boundContentEl);
      boundContentEl = contentEl;
      if (boundContentEl) contentObserver.observe(boundContentEl);
    };

    const attachScrollEl = (scrollEl: HTMLElement | null) => {
      if (scrollEl === boundScrollEl) {
        if (scrollEl) attachContentObserver(scrollEl);
        return;
      }
      if (boundScrollEl) boundScrollEl.removeEventListener("scroll", update);
      boundScrollEl = scrollEl;
      if (boundScrollEl) {
        boundScrollEl.addEventListener("scroll", update, { passive: true });
        attachContentObserver(boundScrollEl);
      } else if (contentObserver && boundContentEl) {
        contentObserver.unobserve(boundContentEl);
        boundContentEl = null;
      }
    };

    const isNavAtScrollEdge = () => {
      if (!nav || !boundScrollEl) return false;
      const maxScroll = boundScrollEl.scrollHeight - boundScrollEl.clientHeight;
      if (maxScroll <= 1) return false;
      return boundScrollEl.scrollTop > 1;
    };

    function update() {
      attachScrollEl(getScrollEl());
      if (!boundScrollEl) {
        nav?.classList.remove("is-scroll-edge--after");
        footer?.classList.remove("is-scroll-edge--before");
        return;
      }
      const scrollTop = boundScrollEl.scrollTop;
      const maxScroll = boundScrollEl.scrollHeight - boundScrollEl.clientHeight;
      const overflows = maxScroll > 1;
      const atBottom = maxScroll <= 1 || scrollTop >= maxScroll - 1;

      nav?.classList.toggle("is-scroll-edge--after", isNavAtScrollEdge());
      if (footer && isFooterVisible()) {
        footer.classList.toggle("is-scroll-edge--before", overflows && !atBottom);
      } else {
        footer?.classList.remove("is-scroll-edge--before");
      }
    }

    const rootObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => update())
        : null;
    rootObserver?.observe(root);

    update();
    requestAnimationFrame(update);

    return () => {
      if (boundScrollEl) boundScrollEl.removeEventListener("scroll", update);
      if (contentObserver && boundContentEl) contentObserver.unobserve(boundContentEl);
      rootObserver?.disconnect();
      nav?.classList.remove("is-scroll-edge--after");
      footer?.classList.remove("is-scroll-edge--before");
    };
  }, [rootRef, enabled]);
}
