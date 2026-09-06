import { useEffect, type RefObject } from "react";

/**
 * Banking-style content indication: shadow under a sticky/pinned bar once
 * content scrolls beneath it.
 *
 * @param scrollRef  Optional overflow scroller (e.g. admin main). When omitted,
 *                   listens to window / document scroll like the guest chrome.
 */
export function useStickyBarScrollEdge(
  barRef: RefObject<HTMLElement | null>,
  scrollRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const scroller = scrollRef?.current;
      if (scroller) {
        const overflows = scroller.scrollHeight - scroller.clientHeight > 1;
        const scrolled = scroller.scrollTop > 1;
        bar.classList.toggle("is-scroll-edge--after", overflows && scrolled);
        return;
      }
      const overflows = document.documentElement.scrollHeight - window.innerHeight > 1;
      const scrolled = window.scrollY > 1;
      bar.classList.toggle("is-scroll-edge--after", overflows && scrolled);
    };

    const scroller = scrollRef?.current;
    if (scroller) {
      scroller.addEventListener("scroll", update, { passive: true });
    } else {
      window.addEventListener("scroll", update, { passive: true });
    }
    window.addEventListener("resize", update);
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(scroller ?? document.documentElement);

    update();
    requestAnimationFrame(update);

    return () => {
      if (scroller) scroller.removeEventListener("scroll", update);
      else window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro?.disconnect();
      bar.classList.remove("is-scroll-edge--after");
    };
  }, [barRef, scrollRef]);
}
