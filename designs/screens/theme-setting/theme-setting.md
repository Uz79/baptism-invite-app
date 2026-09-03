# theme-setting

Figma: [Des-Sys-Test — Baptism Invite Maja](https://www.figma.com/design/IKZcKBuZfweNRvRI0Ji6X3/Des-Sys-Test?node-id=1162-67089)

**Advanced access (admin)** — owner URL (`?admin=TOKEN`). Build themes that guests can pick.

## Layout

1. **Nastawienia** header — close
2. **Light / Dark** shell toggle
3. **Neutral color** — click & set, foreground/background ramps
4. **Theme colors** — Monochrome | Multi-color
5. **Primary color** (multicolor only) — click & set, accent ramp
6. **Live preview** — real components
7. **Palety** — Jednobarwne or Wielobarwne list, **+ Dodaj**, delete
8. **Potwierdź** footer

## Variants

| Variant | Breakpoint | Asset |
|---------|------------|--------|
| monochrome | mobile-default | `variants/monochrome/mobile-default/default.svg` |
| multicolor | mobile-default | `variants/multicolor/mobile-default/default.svg` |

## App

`ThemeFlowOverlay` + `ThemeContrastChecker` when admin access is verified.
