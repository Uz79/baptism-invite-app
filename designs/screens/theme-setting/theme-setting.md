# theme-setting

Figma: [Des-Sys-Test](https://www.figma.com/design/IKZcKBuZfweNRvRI0Ji6X3/Des-Sys-Test?node-id=1122-56102)

Mobile theme settings sheet for the baptism invite app.

## Layout

1. **Theme** header — title, light/dark toggle, close
2. **Neutral color** — click & set circle, foreground/background ramps
3. **Theme colors** — Monochrome | Multi-color
4. **Live preview** — select field + actions
5. **Confirm** footer button

## Variants

| Variant | Breakpoint | Asset |
|---------|------------|--------|
| monochrome | mobile-default | `variants/monochrome/mobile-default/default.svg` (+ `default.png`) |

## App route

Opened from the Overview hamburger menu — implemented in `apps/web/src/components/theme/ThemeFlowOverlay.tsx` and `ThemeContrastChecker.tsx`.
