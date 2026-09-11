# Dashboard Redesign

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `1160aac`

## What this change does

Rebuilt the dashboard header and added a data-driven "journey card" showing
pregnancy or baby-age progress, replacing the old static streak/baby-info
overlay. Also fixed a login timing bug where the journey card would not
appear until the user manually refreshed the app.

## Header redesign

- Removed `<ion-title>` entirely. It has `position: absolute`, ~90px side
  padding, `white-space: nowrap` and `overflow: hidden` by default, which
  clipped the greeting text against the avatar. Replaced with a plain
  `.header-content` div (brand row + greeting row) inside `ion-toolbar`.
- Header background changed from solid purple to a lavender-to-white
  gradient (`linear-gradient(180deg, $lavender-bg 0%, #ffffff 100%)`),
  reusing the app's existing purple accent rather than a new palette.
- Removed `will-change`, broad `transition: all`, and `backdrop-filter`
  from header/overlay elements. These were causing visible flicker on
  scroll; transitions are now scoped to specific properties only.

## Journey card

- `hasJourneyCard()`, `isPregnantJourney()`, `getPregnancyWeeksAndDays()`,
  `getTrimester()`, `getPregnancyProgressPercent()`, `getDaysUntilDue()`,
  `getBabyAgeText()`, `getBabyFirstName()` added to `dashboard.page.ts`.
- Background image swaps between `pregnant-journey-hero.webp` and
  `new-mom-journey-hero.webp` based on `isPregnantJourney()`.
- `isPregnantJourney()` checks `user.motherType` first rather than trusting
  `dueDate` presence, since a `new_mom` account can still have stale/empty
  `dueDate` data.
- A white-to-transparent scrim (`.journey-scrim`) sits over the image so
  dark text stays legible without needing white text on the photo.

## Bug fix: journey card missing after fresh login

Two separate issues, both needed fixing:

1. **Zone timing.** `BackendAuthService` emitted user updates via
   `currentUserSubject.next(...)` from Promise-based Firebase/API calls
   that can resolve outside Angular's zone, so `*ngIf="hasJourneyCard()"`
   wouldn't re-render until an unrelated DOM event forced change detection.
   Fixed by wrapping every emission in a `setCurrentUser()` helper that
   calls `this.ngZone.run(...)`.
2. **Stripped login payload.** The login API response returned a minimal
   user object missing `motherType`/`dueDate`/`babies`. `login()` now
   fetches the full profile via `getUserProfile()` immediately after login
   and re-emits it, so the journey card has real data on first render
   instead of only after a manual refresh.

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/dashboard/dashboard.page.html` | Removed `ion-title`, added header/journey-card markup |
| `src/app/tabs/dashboard/dashboard.page.scss` | Header gradient, journey-card styles, removed flicker-causing CSS |
| `src/app/tabs/dashboard/dashboard.page.ts` | Journey-card data methods, fixed scroll-collapse logic |
| `src/app/services/backend-auth.service.ts` | `NgZone`-wrapped user emissions, full-profile fetch after login |
| `src/assets/images/pregnant-journey-hero.webp` | New illustration asset |
| `src/assets/images/new-mom-journey-hero.webp` | New illustration asset |
