# Knowledge Section Redesign

**Branch:** `feat/registration-onboarding-revamp`

## What this change does

Renamed the "Insights" tab to "Knowledge" and rebuilt its card design to
match a reference layout: pastel-themed cards with an illustration,
difficulty pill, and a bookmark saved-state, replacing the old
hash-based pink/yellow-only gradient cards. Applied the same card theme
system to the category detail ("See all") page and to the dashboard's
Continue Learning card for visual consistency across the app.

## Tab rename

- `tabs.page.html` label changed from "Insights" to "Knowledge". The
  route itself was already `knowledge` (no routing change needed), only
  the visible tab-bar text was stale.

## Knowledge page (main list)

- Removed `<ion-title>Knowledge Base</ion-title>`, added a page header
  ("Knowledge Section" + subtitle + a "See all" pill that opens search),
  matching the header pattern used on dashboard/tracker/profile.
- Cards switched from a horizontal-scroll row to a 2-column grid (3
  columns from 480px up), each with:
  - A themed pastel background (`theme-pink` / `theme-yellow` /
    `theme-lavender` / `theme-mint`), hash-picked per article ID so the
    same article always gets the same theme.
  - A small illustration reusing existing assets
    (`new-mom-journey-hero.webp`, `tracker-hero.webp`,
    `profile-hero.webp`, `tracker-empty-baby.webp`) - a real illustration
    library for each article topic is planned later; this reuses what
    already exists in the repo for now.
  - A difficulty chip, title, summary, and a footer row (read time +
    bookmark button).
- Bookmark button gets a `.saved` class (tinted primary color) when
  `isBookmarked()` is true, instead of only swapping the icon glyph.
- Per-category article limit raised from 5 to 6 (2 full rows of 3, or 3
  rows of 2 on narrow phones) so a category doesn't visually cut off
  mid-row.
- Removed the old hash-based `getRandomGradient()` / `getBorderColor()`
  / `getChipStyle()` methods (2-color-only, inline-style driven) and the
  unused `getDifficultyColor()`, replaced by one `getCardTheme()` helper
  shared with the illustration lookup.

## Category detail page ("See all")

Was a plain white list with a solid-purple banner header (`ion-title`,
flat `ion-chip` rows). Rebuilt to match the main Knowledge page's visual
language:

- Removed `<ion-title>Category</ion-title>` and the `ion-buttons`
  back-button wrapper; replaced with a plain circular back button
  matching the app's established `.back-button` pattern.
- Category banner changed from a solid purple gradient block to the
  same flat lavender-surface card style used elsewhere.
- Article list changed from plain white rows to the same themed card
  grid as the main Knowledge page (own copy of `getCardTheme()` - not
  worth extracting to a shared service for two call sites).

## Continue Learning (dashboard)

- `getCurrentLearningActivity()` and its priority logic (bookmarked
  article, then recent article, then a general fallback) were already
  real and correctly wired - the "Breastfeeding Basics" placeholder text
  seen throughout this session is just the fallback state for accounts
  with no bookmarks or recent reads, not hardcoded copy.
- Visual only: swapped the generic `.activity-icon-badge` (icon on a
  flat purple-tinted square) for the same themed illustration + pastel
  background used on Knowledge cards, via a new `getLearningCardTheme()`
  helper. Falls back to the lavender theme when there's no article
  (`activity.article` undefined).
- The old `--category-color` CSS custom property (fed by
  `article.category.color`) is no longer bound from the template since
  the card now themes via a class instead of an inline style; the
  `.progress-text` color that referenced it now uses `$primary` directly.

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/tabs.page.html` | Tab label "Insights" to "Knowledge" |
| `src/app/tabs/knowledge/knowledge.page.html` | Page header, themed card grid |
| `src/app/tabs/knowledge/knowledge.page.ts` | `getCardTheme()`, removed dead color helpers, category limit 5 to 6 |
| `src/app/tabs/knowledge/knowledge.page.scss` | Page header, `see-all-pill`, card theme classes |
| `src/app/tabs/knowledge/category-detail/category-detail.page.html` | Header/back-button pattern, themed card grid |
| `src/app/tabs/knowledge/category-detail/category-detail.page.ts` | `getCardTheme()`, removed dead `getDifficultyColor()` |
| `src/app/tabs/knowledge/category-detail/category-detail.page.scss` | Full restyle matching Knowledge page |
| `src/app/tabs/dashboard/dashboard.page.html` | Continue Learning card uses themed illustration instead of icon badge |
| `src/app/tabs/dashboard/dashboard.page.ts` | `getLearningCardTheme()` |
| `src/app/tabs/dashboard/dashboard.page.scss` | Theme classes on `.activity-card`, removed dead `--category-color` binding |
