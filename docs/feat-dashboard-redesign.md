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

## Follow-up: standalone greeting banner, trimmed journey card, rotating quotes

Second pass on the same header/journey-card area after feedback that the
in-toolbar greeting felt cramped and the journey card too plain.

### Header and greeting banner

- Toolbar slimmed back down to just brand row (logo, tagline, bell, avatar),
  fixed 64px height, plain white background. No more gradient or greeting
  text inside `ion-toolbar`.
- Greeting (headline + subtitle + date) moved out of the toolbar into a
  standalone `.greeting-banner` card inside `.content-card`, first thing
  the user sees on scroll.
- The banner uses the same `pregnant-journey-hero.webp` /
  `new-mom-journey-hero.webp` illustrations as a background image
  (`isPregnantJourney()` picks which one), with a `.greeting-scrim`
  overlay: a solid-to-transparent horizontal gradient matching the
  `$lavender-surface` background color, keeping text legible regardless of
  what part of the illustration sits underneath.
- `background-size: auto 100%` is used instead of `cover` deliberately.
  `cover` on this 900x338 image computes width from the height ratio
  (168px tall container -> ~447px wide image), which shifts how much of
  the image gets cropped depending on the container's actual width and
  can push the illustrated subject into the text zone. `auto 100%` fixes
  the rendered width at a predictable value so the scrim's opaque zone
  reliably covers the text every time.
- Text column capped at `max-width: 55%` to stay inside the scrim's opaque
  region.

### Journey card

- Reverted to a flat `$lavender-bg` card (no background image), with a
  pink uppercase label, black headline, gray subtext, purple progress bar,
  and a white circular chevron button, matching the richer reference
  layout requested mid-session over the earlier minimal version.

### Continue Learning

- Restyled to match the same list-row pattern used elsewhere: 64px square
  thumbnail (`object-fit: cover`), title + description, circular chevron
  button, whole row clickable. Added a "See All" link in the section
  header for consistency with Quick Actions.
- Thumbnail now resolves via `illustrationForCategory()` (the same
  per-category illustration lookup built for the Knowledge redesign,
  `src/app/tabs/knowledge/knowledge-illustrations.ts`) keyed off the
  current article's `category.id`, instead of a hash-rotated pick from
  four generic dashboard hero images. The no-article fallback state
  hardcodes `categoryId: 'breastfeeding-techniques'`.

### Encouragement quote card

- Restyled to a centered, gradient (`$lavender-bg` to `#fdedf4`) card
  instead of a left-aligned flat-surface strip.
- `encouragementQuote` is now picked randomly from a 20-entry
  `encouragementQuotes` array once in `ngOnInit()`, replacing the single
  hardcoded string. Stays fixed for the session; changes on next app
  open/page load.

### Files changed (this pass)

| File | Change |
|---|---|
| `src/app/tabs/dashboard/dashboard.page.html` | Slimmed toolbar, standalone greeting banner, trimmed journey card, Continue Learning row restyle, quote binding |
| `src/app/tabs/dashboard/dashboard.page.scss` | Greeting banner + scrim, journey card revert, activity-card restyle, quote-card restyle |
| `src/app/tabs/dashboard/dashboard.page.ts` | `encouragementQuotes` array + random pick, `categoryId` on learning activity, `getLearningCardIllustration()` replacing hash-rotated `getLearningCardTheme()` |

## Follow-up: Quote of the Day + self-care tip banner (data-driven)

Third pass: replaced the two still-placeholder pieces from the previous
follow-up (the inline `encouragementQuotes` array and the hardcoded
per-time-of-day greeting subtitle) with real curated datasets, following the
existing `insights.service.ts` + `assets/data/*.json` convention already used
for the daily-tips feature.

### Quote of the Day (24h locked)

- New `src/assets/data/quotes.json`: all 29 supplied quotes, each with an
  `isInclusive` flag. Rows marked `isInclusive: false` are kept in the file
  but filtered out at load time, not deleted, so they can be re-enabled
  later without a data migration.
- New `QuoteService` (`src/app/services/quote.service.ts`) loads the JSON
  once (`shareReplay(1)`), filters to inclusive quotes, and picks one per
  calendar day. The picked quote's id is cached in `localStorage` under
  `quote_of_day` alongside the day key (`YYYY-MM-DD`, the same idiom used
  elsewhere in the codebase), so the quote stays stable across reloads for
  the rest of the day and only changes at midnight.
- `dashboard.page.ts` no longer holds an `encouragementQuote` string or the
  20-entry inline array; it holds a `quoteOfDay: Quote | null` populated
  from `QuoteService.getQuoteOfTheDay()` in `ngOnInit`.
- Attribution: `"quote text" - Author` when `author` is present and not
  `"Unknown"`, otherwise just the quote text. Rendered as a second, smaller
  italic line under the quote in `.quote-card`.

### Self-care tip banner (5 time blocks, refreshes on resume)

- New `src/assets/data/self-care-tips.json`: all 19 supplied tips, tagged
  `Morning` / `Afternoon` / `Evening` / `Night` / `Midnight`.
- New `SelfCareService` (`src/app/services/self-care.service.ts`) loads the
  tips and exposes `pickTip(tips, block)`, a random pick within the current
  time block. Unlike the quote, this is intentionally not day-locked: a tip
  can change more than once a day if the user opens the app in a different
  time block, or resumes the app and the block has changed.
- `getTimeOfDay()` on `dashboard.page.ts` expanded from 3 buckets to 5 to
  match the tip dataset's tags (`Morning` 5-11, `Afternoon` 12-16, `Evening`
  17-20, `Night` 21-23, `Midnight` 0-4), each with its own greeting line and
  emoji (no more ion-icon `sunny`/`moon`/etc, matches the emoji-based
  mockup instead).
- Refresh triggers: on `ngOnInit`, and on app resume via
  `@capacitor/app`'s `App.addListener('resume', ...)` (already a project
  dependency, no new package). The greeting banner's subtitle now renders
  `currentTip.text` and the italic tagline renders `currentTip.title`,
  replacing the three hardcoded `ng-container` branches and the fixed
  "Small steps, big changes" tagline.

### Backend note

Both new services are frontend-only for now (bundled JSON via
`HttpClient.get('/assets/data/...')`), matching the existing
`insights.service.ts` pattern. This is a deliberate stopgap: quotes and
tips should eventually be admin-editable and served from the backend
instead of requiring an app rebuild to change. Each service is written as
the single point where the JSON is fetched, so swapping the HTTP call for a
real API endpoint later is a one-method change per service with no
changes needed in `dashboard.page.ts` or the templates.

### Files changed (this pass)

| File | Change |
|---|---|
| `src/assets/data/quotes.json` | New. 29 quotes with `isInclusive` flag |
| `src/assets/data/self-care-tips.json` | New. 19 tips tagged by time block |
| `src/app/services/quote.service.ts` | New. Day-locked quote selection + attribution formatting |
| `src/app/services/self-care.service.ts` | New. Time-block tip lookup |
| `src/app/tabs/dashboard/dashboard.page.ts` | Removed inline `encouragementQuotes`; added `quoteOfDay`/`currentTip` state, 5-bucket `getTimeOfDay()`, `getGreeting()`/`getGreetingEmoji()`, resume listener |
| `src/app/tabs/dashboard/dashboard.page.html` | Greeting banner now data-driven (single branch instead of three), quote card renders attribution line |
| `src/app/tabs/dashboard/dashboard.page.scss` | `.quote-card` switched to column layout, new `.quote-author` style |
