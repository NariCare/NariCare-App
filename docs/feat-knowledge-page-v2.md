# Knowledge Section v2 (3-level topic hierarchy)

Follow-up to `feat-knowledge-redesign.md`. Superseded the original hero+filter-pill
plan below with a 3-level information architecture (topic grid -> topic page ->
article page) matching a BreastFedNZ reference. See "IA rework" section for
the shipped structure; the "Original plan" section is kept for history.

## IA rework (shipped)

- **`knowledge.page`** (Level 1): solid-gradient hero banner (icon motif, no
  photo) + search bar + 2-col grid of topic tiles, one per `ArticleCategory`,
  each tile a flat `category.color` block with `category.icon` + name.
  Tapping navigates to `category/:id`.
- **`category-detail.page`** (Level 2, "topic page"): hero in the category's
  flat color (icon + name + description + back button), followed by a
  vertical list of rows (small color-block icon thumbnail + title + chevron),
  one per article.
- **`article-detail.page`** (Level 3): hero band in the article's category
  color (icon + title overlay, replaces plain `<h1>`), transparent floating
  header toolbar with dark circular icon chips (readable on any hero color),
  Quick Take box (already shipped), new `quote` content-section type
  (`{ type: 'quote', content, author? }`, renders as pull-quote or
  attributed testimonial), callouts restyled to boxed cards (no left-border
  strip), Related Topics + "You may also find helpful" (already shipped).
- Filter pills and the old per-category card-grid sections on the Knowledge
  home page are removed (superseded by the topic grid).
- Switched from rotated stock illustrations to flat `category.color` +
  `category.icon` blocks everywhere (hero, tiles, topic hero, row thumbnails,
  article hero) after the illustration approach read as repetitive/bland
  (same 6 generic images already used across dashboard/profile/tracker).
  No new image assets needed; removed the now-unused
  `knowledge/knowledge-illustrations.ts` rotation helper.

## Original plan (superseded, kept for history)

## Scope

Both screens:
- `src/app/tabs/knowledge/knowledge.page.{html,scss,ts}`
- `src/app/tabs/knowledge/article-detail/article-detail.page.{html,scss,ts}`

Data: `src/assets/data/knowledge-base.json`, `src/app/models/knowledge-base.model.ts`
(one new optional field, no migration).

## Knowledge list page

1. **Hero banner** replaces the current plain `page-header` text block.
   Lavender/gradient card, `assets/images/new-mom-journey-hero.webp`
   illustration right-aligned, "Knowledge" title + "Trusted guidance for your
   motherhood journey" subtitle on the left, small tagline text near the
   illustration ("Small steps, brighter days").
2. **Search bar** - unchanged, sits below hero.
3. **Filter pill row** (new) - horizontal scroll, "All" pill plus one pill per
   real `ArticleCategory` (icon + name), generated from
   `getCategories()` / the grouped-articles data already fetched, not
   hardcoded to the 4 buckets shown in the mockup screenshot (real data has
   6 finer-grained categories, e.g. "Milk Supply & Production", "Common
   Challenges" are already separate sections and stay separate).
   Selecting a pill client-side filters which category sections render below
   (no route change, no new API call). "All" restores full list.
4. **Category section header** - add a small circular icon badge (category
   `color` as background, category `icon` as ion-icon) to the left of each
   `section-title`, matching the colored-circle-icon look in the mockup.
5. **Article cards** - unchanged. Already match the mockup (illustration,
   difficulty chip, title, summary, read time, bookmark button, 4 rotating
   pastel themes).

## Article detail page

1. **Header** - unchanged (back / listen / bookmark / share icons already
   present).
2. **Quick take box** (new) - pink callout card under the header, sparkle
   icon + "Quick take" label, short synopsis text, heart icon top-right
   (reuses existing bookmark state/toggle, not a separate favorite).
   Backed by a new optional `quickTake?: string` field on `Article`. If an
   article has no `quickTake` in the JSON data, the box is skipped entirely
   (no placeholder text).
3. **Reading controls bar** - keep existing show/hide-on-toggle behavior and
   speed buttons, restyle visually to match the mockup's audio-player look
   (thin progress line, elapsed/total time, pill-shaped speed control)
   instead of the current blue gradient banner. No behavior change.
4. **Content sections** (text/heading/list/callout/table/media) - unchanged.
5. **Related Topics** - unchanged (tag pill row already exists).
6. **"You may also find helpful"** (new) - horizontal row of up to 2 article
   cards below the tags section, same category as current article, current
   article excluded. Reuses the existing small article-card markup/styles
   from the knowledge list page (imported into this page's scss, not
   duplicated logic beyond a simple filter in the component).

## Out of scope

- No backend/API changes; data stays in the local `knowledge-base.json`.
- No new npm dependencies.
- Search page got a visual-only restyle (SCSS tokens to match hero/pill design), no logic/template changes. Category-detail page is not touched.
- Firestore integration remains untouched (`backend-knowledge.service.ts` not used by these pages currently).

## Testing

- Manual: `ionic serve`, verify hero renders, pill filter toggles sections
  correctly (including "All"), section icon badges show correct category
  color/icon, article detail shows Quick take box only when data present,
  reading bar visually matches, related-articles row shows correct
  same-category picks and excludes current article, hides row when no
  other articles exist in that category.
- No unit tests added; existing Karma suite untouched (no new services).
