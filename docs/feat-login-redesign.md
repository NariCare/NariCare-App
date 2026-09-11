# Login Page Redesign

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `cb06fe2`

## What this change does

Rebuilt the login page's hero section and social sign-in buttons to
match a reference design: a full illustration + wordmark hero instead of
a small teardrop logo, and full-width branded social buttons instead of
small circular icon-only ones.

## Hero section

- `.top-section` changed from a centered gray box (`min-height: 50vh`,
  centered logo) to a flex row: `login-hero.webp` illustration on the
  left, a `.brand-block` on the right containing the wordmark, tagline,
  BETA pill, and a handwritten-style secondary tagline ("A happier
  healthier you").
- Background is a soft radial gradient (blush pink to lavender to white)
  instead of flat gray.
- The "NariCare" wordmark is plain styled text (`.wordmark-nari` purple,
  `.wordmark-care` coral), not an image - the existing
  `assets/NariCare logo.svg` is only the small teardrop mark, not a
  wordmark, so it couldn't be reused here.
- `.handwritten-tagline` uses a `cursive` font stack (`'Segoe Script',
  'Comic Sans MS', cursive`) rather than `'Brush Script MT'`, which is
  Windows-only and would silently fall back to a default sans-serif on
  most Android/iOS/Linux devices.
- Welcome copy updated: "Welcome to the NariCare family!" +
  "Let's support you on this beautiful journey." subtitle (previously
  no subtitle existed for the non-2FA state).
- Added a closing `.footer-note` below the social buttons: a small pink
  heart icon + "You are not alone. We are with you."

## Social sign-in buttons

- Changed from `--border-radius: 50%` icon-only circles to full-width
  bordered pill buttons (`fill="outline"`) with icon + "Continue with
  Google"/"Continue with Facebook" text, laid out side by side via
  `flex: 1` on `.social-button`.
- Ionicons' `logo-google`/`logo-facebook` only render as flat
  single-color glyphs, not the real multi-color Google "G" or blue
  Facebook "f". Replaced with inline SVG markup (official brand colors)
  directly in the template - no new icon library or asset needed.

## Files changed

| File | Change |
|---|---|
| `src/app/pages/auth/login/login.page.html` | Hero markup, wordmark, welcome copy, inline brand-SVG social buttons, footer note |
| `src/app/pages/auth/login/login.page.scss` | Hero layout, wordmark/tagline styles, social button pill styles, cleaned up dead `.logo-image` responsive rules |
| `src/assets/images/login-hero.webp` | New illustration asset (transparent background) |
