# ClickUp UI Fixes and Dashboard Cleanup

**Branch:** `feat/registration-onboarding-revamp`
**Repo:** `NariCare-App`

## What this covers

A batch of UI bug fixes reported in ClickUp plus a round of dashboard and profile cleanup. Each item below maps to a ClickUp ticket. The registration wizard itself is documented separately in `feat-registration-onboarding-revamp.md`; this doc covers the fixes layered on top.

## ClickUp bug tickets (fixed)

### Tracker subtitles (feed and diaper)

Updated the subtitles on the Track Today cards in the Growth tab.

- Feed: "Track breastfeeding, expressed milk, and formula feeds"
- Diaper change: "Track your baby's pee and poop"
- Weight and pumping left unchanged.

File: `src/app/tabs/growth/growth.page.html`.

### Registration choice-card icons and country-code alignment

Two parts on the register flow:

- **Choice cards** ("I'm pregnant" / "I'm a new mother") now use full pastel illustrations (lavender and coral) matching the app's journey-hero art, instead of the old small glyphs. The cards got a real selected state: a highlight ring, a checkmark badge, a soft lift, and the label turning primary.
- **Country code box** on the phone step now matches the phone input's border, height and inner padding so the two read as one row (was left-shoved with a lighter border).

Files: `register.page.ts` (icon paths), `register.page.html` (card markup), `register.page.scss` (`.country-select`, `.answer-card*`), plus `src/assets/images/pregnant-choice.webp` and `new-mom-choice.webp`.

### Password fields disappearing while typing (mobile)

The two password fields on the password step collapsed to near-zero height while typing on mobile.

**Cause:** `.password-input` had `--padding-top: 0 !important; --padding-bottom: 0 !important` (added earlier to fit the eye toggle). With `fill="outline"` and no vertical padding, the field's content area collapsed as it re-laid out on each keystroke. Only the password fields carried this override, which is why only they misbehaved.

**Fix:** removed the zero-padding override so the fields inherit `.custom-input`'s `min-height: 56px` and `18px` vertical padding. Kept `--padding-end: 4px` so the eye toggle still sits snug.

File: `register.page.scss` (`.password-input`).

### Due-date calendar lag after "I'm pregnant"

The calendar on the date step took about 3 seconds to appear.

**Cause:** `[min]` and `[max]` on `<ion-datetime>` were bound to method calls (`getTodayDate()`, `getMaxDueDate()`, ...). Angular re-invokes template method bindings on every change-detection cycle, and each returned a fresh string, so ion-datetime kept re-rendering its calendar grid.

**Fix:** precomputed the values once as `readonly` properties (`todayDate`, `maxDueDate`, `minDeliveryDate`) and bound the properties instead. Stable references, no repeated recompute.

Files: `register.page.ts`, `register.page.html`.

### Home greeting banner faded on small screens

The mother-and-baby illustration in the home greeting banner looked washed out on small screens.

**Cause:** `.greeting-scrim` is a fade overlay that keeps the greeting text readable over the background image. Its gradient reached too far across the card (solid to 50%, clearing at 78%), and the `max-width: 360px` override pushed it further (58% / 86%), so a semi-opaque lavender layer sat over the illustration.

**Fix:** pulled the fade back (solid to ~42-46%, fully clear by ~62-66%) so it only covers the text column on the left and the illustration on the right stays crisp. Text remains readable.

File: `src/app/tabs/dashboard/dashboard.page.scss` (both `.greeting-scrim` gradients).

## Dashboard and profile cleanup

### Hide Today's Insights and Timeline

Both sections are hidden on the home screen for now. Timeline will return once finalized content exists.

**Cause / fix:** `shouldHideSection()` was only hiding these for expert users and ignored the `hiddenSections` list entirely (dead code). Rewrote it to honor `hiddenSections` (currently `['insights', 'timeline']`) so both are hidden for everyone, plus experts as before. Re-enabling Timeline later is a one-line change: remove `'timeline'` from `hiddenSections`.

File: `src/app/tabs/dashboard/dashboard.page.ts`.

### Remove subscription and consultations display

The subscription-plan and expert-consultation UI is no longer shown. The markup and menu items were already removed; this round also disabled the leftover `loadUpcomingConsultations()` and `loadExperts()` calls in profile init so the app stops fetching data nothing renders. Re-enable those calls alongside the consultation UI.

File: `src/app/tabs/profile/profile.page.ts`.

### Quote-of-the-day formatting

Rule: author present shows the quote in quotation marks with a "- Author" attribution; no author (or an "Unknown" author) shows the text plain, with no quotes and no attribution. Implemented via `QuoteService.getAttribution()` and the dashboard's `hasQuoteAuthor()` / `getQuoteAttribution()`, driving the template branch.

Files: `src/app/services/quote.service.ts`, `src/app/tabs/dashboard/dashboard.page.ts`, `dashboard.page.html`.

### Chat UI fixes

Four small issues on the AI chat screen:

- "AI is typing" label was positioned off-screen (`left: -120px`) - now inline with `margin-right`.
- Message input bar was missing its top border and shadow - restored.
- Plus (attachment) icon alignment - flex-centered, 36px round, 44px touch target on mobile.
- Text box overlapping the buttons - `.message-input` uses `align-items: flex-end` with restored padding, so a growing text box no longer overlaps.

Files: `src/app/components/ai-chat/ai-chat.component.html`, `ai-chat.component.scss`.

## Deferred

### Sanity CMS integration (blocked)

Not started. Sanity is not integrated today (no dependency, no code). Article content currently loads two ways: a static JSON fallback in `assets/data/knowledge-base.json`, and the live REST API, both sharing the same `Article` / `ArticleCategory` model.

**Recommendation:** defer. The content structure is blocked on the finalized Excel sheet and organized Drive folders. Once final, Sanity slots in behind the existing `Article` contract as a third content source (a Sanity service implementing the same interface, GROQ queries, image URL builder). Rough effort once unblocked: 1-2 days.

## How to verify

1. `npm start` (or `ionic serve`).
2. Growth tab: Feed and Diaper cards show the new subtitles.
3. Register, step with the phone field: `+91` box lines up with the phone input.
4. Register, choice step: illustrated cards, tap shows the checkmark/ring.
5. Register, password step: type in both fields, boxes hold full height.
6. Register, date step after "I'm pregnant": calendar appears immediately.
7. Home screen at phone width: banner illustration is crisp, text readable.
8. Home screen: no Today's Insights, no Timeline.
9. Profile: no subscription or consultations sections.
10. Quote of the day: with-author quotes show quotes + attribution; author-less quotes show neither.
11. AI chat: typing label inline, input bar bordered, icons aligned, no overlap while typing.

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/growth/growth.page.html` | Feed and diaper tracker subtitles |
| `src/app/pages/auth/register/register.page.ts` | Choice-card icon paths, precomputed date min/max |
| `src/app/pages/auth/register/register.page.html` | Choice-card markup, datetime property bindings |
| `src/app/pages/auth/register/register.page.scss` | Country-select alignment, answer cards, password field padding |
| `src/app/tabs/dashboard/dashboard.page.ts` | `shouldHideSection` honors `hiddenSections`; quote helpers |
| `src/app/tabs/dashboard/dashboard.page.scss` | Greeting-banner scrim fade |
| `src/app/tabs/dashboard/dashboard.page.html` | Insights/timeline gating, consultation section, quote template |
| `src/app/tabs/profile/profile.page.ts` | Disabled dead consultation/expert fetches |
| `src/app/services/quote.service.ts` | Attribution rule |
| `src/app/components/ai-chat/ai-chat.component.html` | Chat a11y labels |
| `src/app/components/ai-chat/ai-chat.component.scss` | Typing label, input border, icon alignment, overlap |
| `src/assets/images/pregnant-choice.webp`, `new-mom-choice.webp` | Choice-card illustrations |
| `docs/feat-clickup-ui-fixes.md` | This document |
