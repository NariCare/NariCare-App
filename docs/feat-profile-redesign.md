# Profile Page Redesign

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `f2d5b82`

## What this change does

Rebuilt the profile header card to match the dashboard's journey-card
visual language (full illustration + scrim, not a plain flat card or a
clashing gradient), fixed a tier-chip contrast bug, added a 3-column stat
row, and relabeled the account/support sections.

## Header card iteration history

This went through several rounds based on feedback before landing on the
final design:

1. Started as a solid pink/purple gradient card - rejected, clashed with
   the illustration's own baked-in gradient.
2. Tried a flat lavender card with the illustration as a small faded
   corner accent - illustration read as an awkward cropped afterthought.
3. Tried a full-width banner strip below the text - looked disconnected
   from the header card above it.
4. **Final:** same pattern as the dashboard's `.journey-card` - the
   illustration (`profile-hero.webp`, transparent background, mother
   portrait with heart accents) sits as the card's background image,
   right-aligned, `background-size: contain`. A left-to-right white
   scrim (`.profile-header-scrim`) keeps the name/email/chip legible
   without needing white text on the image. Same drop shadow as
   `.journey-card`.

## Tier chip contrast bug

`ion-chip [color]="getTierColor()"` returns Ionic's built-in `'medium'`
color name for the Basic tier. Ionic's `ion-color-medium` class applies
its own `--ion-color-medium-contrast` (near-white) styling that overrode
the custom `--background`/`--color` custom properties, making the chip
text nearly invisible against the card. `--background`/`--color` custom
properties are not enough to fully override this - the fix sets a plain
`background`/`color` with `!important` directly on `.chip`, bypassing
Ionic's custom-property indirection.

## Stat row

Added a 3-column white card below the header (consultations remaining,
babies added, member-since), left-aligned briefly during iteration but
reverted to centered per feedback - only the header card's banner
treatment was in scope for the redesign, not the stat row's alignment.
`.stat-value` font-size trimmed slightly so "September 2026" fits on one
line instead of wrapping and breaking the row's vertical alignment.

## Other changes

- Removed the redundant "N consultations remaining" text next to the
  tier chip - the same number already shows in the stat row below.
- "Account" section retitled to "My Account" with an "Edit Profile" link.
- "Support" section retitled to "Support & Resources".

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/profile/profile.page.html` | Header card markup, stat row, section retitles |
| `src/app/tabs/profile/profile.page.scss` | Journey-card-style header, chip contrast fix, stat-row styles |
| `src/app/tabs/profile/profile.page.ts` | `iconColor`/`subtitle` metadata on account/support item arrays |
| `src/assets/images/profile-hero.webp` | New illustration asset (transparent background) |
