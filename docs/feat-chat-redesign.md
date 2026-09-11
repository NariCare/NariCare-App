# Chat & AI Assistant Redesign

**Branch:** `feat/registration-onboarding-revamp`
**Commit:** `27abe52`

## What this change does

Restyled the Chat & Support page and the embedded AI assistant component
to match the app's design language, and replaced the generic AI icon
with the actual NariCare logo throughout the chat UI.

## Chat & Support page

- Removed `<ion-title>Chat & Support</ion-title>` (same clipping issue as
  dashboard/tracker).
- Added a hero header with a two-bubble decorative icon accent
  (`ion-icon name="chatbubbles"` + `ion-icon name="heart"`, no new image
  assets needed here).
- `selectedTab` segment (AI Assistant / Support Groups) restyled as a
  purple pill toggle, reusing the same `.main-tab-selector` pattern
  already established on the Tracker page.

## AI Assistant component

- Added an `.assistant-header` card above the chat: avatar (reusing
  `profile-hero.webp`), a green "online" dot, "NariCare AI" title,
  "Your personal motherhood companion" subtitle, and an "Online" status
  pill on the right.
- Message input restyled to a pill shape: `+` icon button (was a
  paperclip `attach` icon) with a light lavender circular background,
  placeholder text changed to "Ask NariCare anything...", purple
  circular send button.
- Bot avatar icon replaced everywhere: `hardware-chip-outline` (a
  generic AI/chip icon) → `assets/NariCare logo.svg`, in the welcome
  bubble, the loading state, and every bot message. Avatar circle
  changed from a solid purple fill to a white circle with a subtle
  lavender border so the logo reads clearly against it. Padding was
  tuned down from 5px to 3px so the logo isn't over-shrunk inside the
  32px circle.
- Added a `.quick-questions` section (3 full-width rows with colored
  icon badges) for the empty/pre-chat state, wired to the existing
  `handleFollowUpAction()` handler.

## Note on `.follow-up-options`

Accounts with an existing persisted first bot message (one that already
has `followUpOptions` from a prior session) will see the older
`ion-button` pill-style follow-up options instead of the new
`.quick-questions` row layout, since `hasMessages()` being true skips the
new empty-state block entirely. This is existing behavior, not a
regression from this change - it only affects accounts with pre-existing
chat history.

## Files changed

| File | Change |
|---|---|
| `src/app/tabs/chat/chat.page.html` | Removed `ion-title`, hero header, pill tab toggle |
| `src/app/tabs/chat/chat.page.scss` | Hero header styles, pill tab-selector styles |
| `src/app/components/ai-chat/ai-chat.component.html` | Assistant header card, NariCare logo avatars, quick-questions rows, pill message input |
| `src/app/components/ai-chat/ai-chat.component.scss` | Assistant header, avatar, and input-bar styles |
| `src/app/components/ai-chat/ai-chat.component.ts` | Added `welcomeTime` for the welcome bubble timestamp |
