# Tracker (Growth) Page Redesign

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `3375d7c`

## What this change does

Restyled the Tracker tab to match the app's new design language (same
lavender token set as dashboard/profile), added a hero illustration
banner, and gave the empty-babies state a real illustration and working
call to action instead of plain text.

## Changes

- Removed `<ion-title>` (same clipping issue as dashboard - see
  `feat-dashboard-redesign.md`).
- Added `.tracker-hero` banner using `tracker-hero.webp`, with a
  "Track Today" section heading below it.
- Restyled the 4 tracker cards (feeding, sleep, diaper, pumping) with a
  `.tracker-description` line and a colored `.tracker-arrow-badge` per
  card, matching the Quick Actions card pattern from the dashboard.
- Emotional check-in card changed from a static row to
  `*ngFor="let mood of motherMoodOptions"`, driving real emoji/mood data
  instead of hardcoded markup.
- Empty-babies state now shows `tracker-empty-baby.webp` with a real
  `<ion-button (click)="openAddBabyModal()">` instead of static copy.
- `.main-tab-selector` pill-toggle override is scoped to this page only
  and does not touch the app-wide peach segment styling in `global.scss`.

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/growth/growth.page.html` | Hero banner, restyled tracker cards, real mood data, empty-state illustration |
| `src/app/tabs/growth/growth.page.scss` | Shared token block, hero/card/empty-state styles, scoped tab-selector override |
| `src/assets/images/tracker-hero.webp` | New illustration asset |
| `src/assets/images/tracker-empty-baby.webp` | New illustration asset |
