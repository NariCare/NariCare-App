# Mobile Viewport Height Fixes

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `3f0cf41`

## What this change does

Fixed the register wizard's Continue/Create account button getting
pushed below the fold on real phones (reported on iPhone 16, Xiaomi 11i
5G, Samsung S23 FE), and applied the same underlying viewport-height fix
consistently across every other page and modal in the app that had the
same latent bug.

## The bug

`100vh` on mobile browsers is measured against the *largest possible*
viewport, i.e. with the collapsible address bar/toolbar hidden. The
actual visible viewport when the page first loads (toolbar shown) is
shorter. Any layout built on `100vh` math ends up taller than what's
actually on screen, so anything anchored to "the bottom of 100vh" can
sit below the real, currently-visible bottom edge until the user
scrolls (or the browser chrome happens to collapse).

`100dvh` (dynamic viewport height) tracks the *actual* visible viewport
and updates as the browser chrome shows/hides, which is what these
layouts actually need.

## Register wizard: a deeper fix, not just vh to dvh

Swapping to `dvh` alone wasn't enough here, because the step footer
(Continue / Create account button) was laid out in normal document flow
at the bottom of a `min-height` container, with `ion-content` itself
still able to scroll the whole page. On a step with enough content
(the date picker, the terms/summary step), the footer would get pushed
past the visible area and the whole page had to be scrolled to reach it
- exactly what was reported.

Fix, in `register.page.html` / `register.page.scss`:

- `<ion-content class="register-content" [scrollY]="false">` - disables
  the page's own scroll. The wizard should never scroll as a whole page;
  only its content should scroll internally when a step is tall.
- `.register-container` changed from `min-height: 100vh` to `height:
  100%` - a definite height that fills the real, already-dvh-aware
  `ion-content` area, instead of a minimum that could be exceeded.
- `.register-form` changed from `min-height: calc(100vh - 90px)` to
  `flex: 1; min-height: 0`, and `.step-body` got `flex: 1; min-height: 0;
  overflow-y: auto`. The `min-height: 0` on both is required for
  flexbox to actually let a flex child shrink and scroll internally -
  without it, `overflow-y: auto` never engages because the browser
  refuses to shrink the element below its content's natural size.
- `.stepper-header` and `.step-heading` got `flex-shrink: 0` so they
  can never get compressed by the flex layout, only `.step-body` gives
  up space.

Net effect: the header (back button + progress bar) and the footer
(Continue/Create account button) are always pinned in view. Only the
step's own content (a date picker calendar, a goals list, etc.) scrolls
internally if it doesn't fit.

Verified at 393x852 (iPhone-16-class) and 412x915 (common Android
flagship, close to Xiaomi 11i 5G / Samsung S23 FE) across the shortest
step (name) and the two heaviest (date picker, terms/summary) - button
fully visible with no scroll needed in every case.

## App-wide dvh fallback

`onboarding.page.scss` and the chat tab (`chat.page.scss`) already had
the `100vh` then `100dvh` override pattern in place. The rest of the app
was inconsistent. Added the same fallback (`min-height: 100dvh` /
`height: 100dvh` right after the `100vh` line, so unsupported browsers
still get the `100vh` value and modern ones get the corrected `dvh`
value) to every other file using raw `100vh`:

- `src/app/pages/auth/login/login.page.scss`
- `src/app/pages/auth/forgot-password/forgot-password.page.scss`
- `src/app/pages/auth/reset-password/reset-password.page.scss`
- `src/app/pages/expert-notes/expert-notes.page.scss`
- `src/app/tabs/dashboard/dashboard.page.scss`
- `src/app/tabs/growth/growth.page.scss`
- `src/app/tabs/growth/timeline/timeline.page.scss`
- `src/app/tabs/growth/specific-week/specific-week.page.scss`
- `src/app/pages/chat-room/chat-room.page.scss` (its `calc(100vh - 56px
  - 100px)` message-area height, not the message input bar, which was
  already correctly `position: fixed`)
- `src/app/components/specific-week-modal/specific-week-modal.component.scss`
- `src/app/components/timeline-modal/timeline-modal.component.scss`

None of these had a button-hidden-below-fold bug like register did -
they're regular scrollable pages, not fixed-viewport step wizards - but
they all had the same stale viewport-height measurement, so the same
defensive fallback was applied for consistency.

## Files changed

| File | Change |
|---|---|
| `src/app/pages/auth/register/register.page.html` | `[scrollY]="false"` on `ion-content` |
| `src/app/pages/auth/register/register.page.scss` | Pinned header/footer layout, internally-scrolling step body |
| `src/app/pages/auth/login/login.page.scss` | `100dvh` fallback |
| `src/app/pages/auth/forgot-password/forgot-password.page.scss` | `100dvh` fallback |
| `src/app/pages/auth/reset-password/reset-password.page.scss` | `100dvh` fallback |
| `src/app/pages/expert-notes/expert-notes.page.scss` | `100dvh` fallback |
| `src/app/pages/chat-room/chat-room.page.scss` | `100dvh` fallback on message-area height calc |
| `src/app/tabs/dashboard/dashboard.page.scss` | `100dvh` fallback |
| `src/app/tabs/growth/growth.page.scss` | `100dvh` fallback |
| `src/app/tabs/growth/timeline/timeline.page.scss` | `100dvh` fallback |
| `src/app/tabs/growth/specific-week/specific-week.page.scss` | `100dvh` fallback |
| `src/app/components/specific-week-modal/specific-week-modal.component.scss` | `100dvh` fallback |
| `src/app/components/timeline-modal/timeline-modal.component.scss` | `100dvh` fallback |
