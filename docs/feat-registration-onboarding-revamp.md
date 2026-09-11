# Registration and Onboarding Revamp

**Branch:** `feat/registration-onboarding-revamp`
**Repos:** `NariCare-App` (this repo) and `NariCare-Service` (backend validation, committed separately)

## What this branch does

The register screen was rebuilt as a one-question-per-step wizard with strict field validation on both the client and the server. The goals:

1. Catch bad input in the UI before it ever reaches the backend.
2. Keep the exact same rules on the backend so a direct API caller cannot bypass them.
3. Give the flow a cleaner look: bigger centered logo with a Beta tag on the welcome screen, and a proper calendar for date selection.

## The 9-step flow

1. **Welcome** - centered NariCare logo with a Beta pill below it, Get started button.
2. **Name** - single "full name" field. Auto-splits into `firstName` (all words except the last) and `lastName` (last word).
3. **Phone** - country selector (default `+91`) + number, optional WhatsApp toggle.
4. **Email** - single field.
5. **Password** - password + confirm password with show/hide toggles.
6. **Stage** - "I'm pregnant" or "I'm a new mother" answer cards.
7. **Date** - calendar. Due date (pregnant) or delivery date (new mom). Only one shows, based on stage.
8. **Goals** - multi-select goal cards.
9. **Finish** - summary of all answers, terms checkbox, Create account button.

Each step gates the Continue button (`canGoNext()`), and a blocked attempt marks the fields touched so the inline error shows.

## Validation rules (client and server)

All rules live in `register.page.ts` (client) and `NariCare-Service/middleware/validation.js` (server, `validateRegister`). Keep both sides in sync when you change any rule.

### Full name
- Two or more words (first and last name required).
- Letters, spaces, hyphens and apostrophes only. Unicode letters are allowed (e.g. "José").
- Max 50 characters.

### Phone (with `countryCode`)
- Client sends digits only in `phoneNumber` plus a separate `countryCode` field (e.g. `+91`).
- When `countryCode` is `+91`: exactly 10 digits, first digit must be 6, 7, 8 or 9 (Indian mobile rule). Input is capped at 10 digits while typing.
- Any other country code: 10 to 15 digits (E.164 length rule).
- The country selector whitelists `+91, +1, +44, +61, +971, +65` on the server too.
- Changing the country re-runs validation on both phone fields immediately.

### Email
- Single `@`, local part max 64 chars, total max 254.
- No leading, trailing or consecutive dots in the local part.
- Domain must have a valid hostname shape and a TLD of at least 2 letters.

### Password
- Min 8 characters (max 128 on the server).
- At least one uppercase letter, one lowercase letter and one number.
- No spaces.

### Dates
- Due date: today or later, capped one year out.
- Delivery date: today or earlier, going back three years.
- The calendar itself disables out-of-range dates, and the validators double-check on submit.

## API contract notes

- `POST /api/auth/register` payload now includes `countryCode` alongside the digits-only `phoneNumber` and `whatsappNumber`. `countryCode` is optional and defaults to `+91` server-side.
- Dates are sent as `YYYY-MM-DD`. The picker produces full ISO strings internally; `formatDateForApi()` strips the time part before sending.

## Important bug fix: validator `this` binding

`phoneNumberValidator` needs to read `selectedCountryCode`, so it references `this`. It was first written as a normal class method and passed into `formBuilder.group()` like `this.phoneNumberValidator`. Angular calls validators as plain functions, so `this` was `undefined` at runtime and the validator threw a TypeError. The nasty part: Angular sets the control status to VALID *before* running validators, and the throw stopped the error assignment, so an invalid phone silently passed and only the server rejected it.

**Fix:** the validator is an arrow-function class property:

```typescript
phoneNumberValidator = (control: any): { [key: string]: boolean } | null => {
  // `this` is now the component instance
};
```

**Rule for anyone adding validators:** if a validator reads component state via `this`, define it as an arrow-function property, not a method. The other custom validators in this file do not use `this`, so they stay as plain methods.

## UI changes

### Welcome screen
- NariCare logo enlarged to 176px, centered.
- Beta pill sits below the logo in normal flow (spaced with margin), not overlapping it.
- The breastfeeding journey illustration was removed.

### Date selection
- Replaced the native `<ion-input type="date">` with `<ion-datetime presentation="date" size="cover">` for a consistent calendar on all platforms.
- `ion-datetime` has no Angular value accessor in `@ionic/angular`, so it is wired manually: `[value]` reads from the form control and `(ionChange)="onDateSelect($event, 'dueDate')"` writes back and marks the control touched.
- The finish-step summary shows dates via `formatDisplayDate()` (e.g. "10 Sep 2026") instead of raw ISO strings.

## How to verify

1. `npm start` (or `ionic serve`) and start NariCare-Service.
2. Walk through the wizard:
   - Name: try a single word, digits, or symbols. All must show inline errors.
   - Phone with `+91`: `1234567890` must show "Indian mobile numbers must start with 6, 7, 8, or 9" and block Continue. `9876543210` must pass.
   - Switch country to `+1` after entering a valid Indian number. Validation must re-run.
   - Email: `x@example` and `x..y@example.com` must fail.
   - Password: 7 chars, or missing a number, or containing a space must fail.
   - Date: due-date calendar must not allow past dates; delivery-date calendar must not allow future dates.
3. Submit with valid data and confirm the account is created (server also re-validates everything).
4. Optional: hit `POST /api/auth/register` directly with `phoneNumber: "1234567890"` and `countryCode: "+91"` to confirm the server-side rejection.

## Files changed

| Repo | File | Change |
|---|---|---|
| NariCare-App | `src/app/pages/auth/register/register.page.ts` | Wizard logic, validators, error messages, date helpers, `countryCode` in payload |
| NariCare-App | `src/app/pages/auth/register/register.page.html` | Step markup, `fullName` binding, Beta tag, `ion-datetime` calendar, formatted summary |
| NariCare-App | `src/app/pages/auth/register/register.page.scss` | Wizard styling, welcome screen, Beta pill, calendar styles |
| NariCare-App | `docs/feat-registration-onboarding-revamp.md` | This document |
| NariCare-Service | `middleware/validation.js` | Hardened `validateRegister`: name/phone/email/password rules, `countryCode` whitelist, future-only due date |
