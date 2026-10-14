# Login Page Redesign

**PRs:** #62 (redesign, merge `c669c2e`), #63 (taglines). Both merged into `staging` and live on Beta 2026-09-28.
**Replaces:** the earlier hero + social-button layout from `cb06fe2` (see git history of this file).

## What this change does

Rebuilt the sign-in screen to match the approved mockup, using `Designs/NariCare brand guidelines.pdf` for colours and fonts and the official logo from `Designs/`. The page is mobile-first and fits one phone screen without scrolling. From 1024px the layout switches to side by side.

## Layout

- **Brand panel:** official logo, the tagline "Expert breastfeeding knowledge, guidance, and support.", three pillars (Expert Guidance, 24/7 AI Support, Supportive Community), the mother and baby illustration and a small Beta tag. Admin and LC portals show their own `COPY.panelTitle` / `COPY.panelText` in place of the tagline and pillars.
- **Form panel:**
  - "Welcome!" heading and subtitle, centred.
  - Email and password fields with leading icons, "Forgot password?", then Log In.
  - "Not a member? Register now" at the bottom.
  - The form is vertically centred in the space between the brand panel and the footer.
- **Footer:** lavender wave with "Healthier babies ♡ Brighter tomorrows".
- **Hidden, not deleted:** Google/Facebook buttons and the LC sign-in link are commented out in `login.page.html`. Restore them once new social credentials exist.

## Brand tokens (login.page.scss)

| Token | Value | Use |
|---|---|---|
| `$ink` | `#3A3A47` | brand dark, body headings |
| `$primary` | `#8484BF` | brand lavender 4, icons, focus |
| `$line` | `#DEDAED` | brand lavender 1, borders and dividers |
| `$cream` | `#FFFCF9` | brand cream, page background |
| `$link` | `#5F5EA3` | `#7676B7` darkened for AA contrast; links, Beta tag, "Welcome!" title |
| Log In gradient | `#9384D8` to `#8474C6` | picked from the mockup |


## Fonts

`src/index.html` loads Poppins (300 to 700, primary) and Merriweather (700/900, headings) from Google Fonts. Poppins was referenced app-wide before but never loaded, so every screen now renders in the real brand font. Inter is still loaded for `growth.page.scss`.

## Wave component

`src/app/components/wave/wave.component.ts` is a standalone `app-wave` with `variant="top" | "bottom"`.
- Its viewBoxes (`390x64` / `72`) are close to phone proportions, so the curves stay visible when stretched with `preserveAspectRatio="none"`. The first version used traced 2000px-wide paths, and those flattened into straight lines.
- `top` draws a lavender band plus a cream layer, so the form panel meets the brand panel on a curve.
- Use `[attr.viewBox]`; a plain `[viewBox]` binding throws NG8002.

## Gotchas

- The password toggle is a native `<button slot="end">`, not `ion-button`. An `ion-button` made the password field taller than the email field.
- The Log In button keeps full colour while disabled (`&.button-disabled { opacity: 1 }`), as in the mockup. It still can't be tapped until the form is valid.
- `.form-panel` has `position: relative; margin-top: -1px` so it covers the brand panel's last gradient row. Without it, a straight seam shows under the top wave.
- The "•••" icons inside the inputs in some screenshots come from a password-manager extension, not the app.

## Files changed

| File | Change |
|---|---|
| `src/app/pages/auth/login/login.page.html` | New brand panel, form panel and footer; social and LC links commented out |
| `src/app/pages/auth/login/login.page.scss` | Rewritten mobile-first with brand tokens; desktop side by side at 1024px |
| `src/app/pages/auth/login/login.page.ts` | User portal copy: "Welcome!" plus a two-line subtitle |
| `src/app/pages/auth/login/login.module.ts` | Imports `WaveComponent` |
| `src/app/components/wave/wave.component.ts` | New wave divider |
| `src/assets/images/login/naricare-logo.webp` | Official logo, trimmed from `Designs/NariCare logo_Light background.png` (440x192) |
| `src/assets/images/login/mother-baby.webp` | Illustration, background knocked out (760x760) |
| `src/index.html` | Brand font link |

## Open

- Check on a real iPhone and Android that the page doesn't scroll and the footer wave looks right.
