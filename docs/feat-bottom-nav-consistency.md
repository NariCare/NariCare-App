# Bottom Navigation Icon Consistency

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `2e5b4af`

## What this change does

The bottom tab bar mixed two different icon sources: Home and Chat used
`ion-icon`, while Insights, Tracker and Profile used raw `<img>` SVGs with
CSS `filter: brightness(0) saturate(100%) invert(...)` hacks to recolor
them for selected/unselected state. This produced inconsistent icon
weight, sizing and color transitions across tabs.

## Fix

- Insights → `<ion-icon name="book">`
- Tracker → `<ion-icon name="bar-chart">`
- Profile → `<ion-icon name="person">`

All five tabs now use `ion-icon` exclusively, styled through the existing
`--color` / `--color-selected` custom properties on `.tab-button` rather
than per-icon filter overrides. The filter-hack CSS block was removed.

## Standing rule for this app

Icons should always be Ionicons (`ion-icon name="..."`), not raw SVG +
CSS filter-color hacks, and not emoji used as structural icons.

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/tabs.page.html` | Swapped `<img>` icons for `ion-icon` on Insights/Tracker/Profile |
| `src/app/tabs/tabs.page.scss` | Removed `filter` color-hack rules, kept single `ion-icon` color scheme |
