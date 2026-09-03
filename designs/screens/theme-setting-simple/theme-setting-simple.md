# theme-setting-simple

Figma: [Des-Sys-Test — Baptism Invite Maja](https://www.figma.com/design/IKZcKBuZfweNRvRI0Ji6X3/Des-Sys-Test?node-id=1162-67089)

**Simple access (guest)** — plain invite URL. Pick a palette the admin saved; no color editor.

## Layout

1. **Wybierz twoje kolory** header — close
2. **Light / Dark** segmented control
3. **Jednobarwne** — monochrome palette cards (Paleta A selected in the default export)
4. **Wielobarwne** — multicolor palette cards (Paleta E selected in the multicolor export)
5. Color thumbs are all **16×24** rounded rects (foreground, background, and primary)
6. **Potwierdź** — uses the selected palette’s primary / foreground

## Variants

| Variant | Breakpoint | Assets |
|---------|------------|--------|
| monochrome | mobile-default | `variants/monochrome/mobile-default/default.svg` + `default.png` |
| multicolor | mobile-default | `variants/multicolor/mobile-default/default.svg` + `default.png` |

## App

`ThemeFlowOverlay` + `GuestThemePicker` when admin token is absent.
