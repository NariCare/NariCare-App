# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

- `staging` is the main branch for this repo. Always create new branches from `staging`.
- Never commit directly to `staging`, `master`, or `main`. Always work on a feature branch and commit there.
- When a feature is done, raise a PR into `staging`. The PR must include a thorough code review and a clear description of what changed and why.
- Commit only when explicitly asked, and only the files the user names.

## UI Design

- When building or changing UI in NariCare-App, use design skills for higher quality. The `/ui-ux-pro-max` skill (and similar UI/design skills or agents) are encouraged for polished, production-grade interfaces.

## Development Commands

```bash
# Start development server
ionic serve
# or
npm start

# Build for production
ionic build --prod
# or
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Development build (watch mode)
npm run watch

# E2E tests
npm run e2e
```

## Architecture Overview

This is an Ionic Angular application for breastfeeding support (NariCare) with the following key architectural components:

### Tech Stack
- **Framework**: Ionic 7 with Angular 17
- **Backend**: NariCare REST API (Node/Express, MySQL). The app talks only to this API for data and email/password auth (JWT access + refresh tokens)
- **Firebase (project `naricare-app`)**: used only for Google sign-in and FCM web push. Not used as a database
- **AI Integration**: OpenAI GPT API (encrypted key in environment)
- **Mobile**: Capacitor for iOS/Android builds
- **Charts**: Highcharts for growth tracking visualizations

### Project Structure
```
src/app/
├── guards/           # Route guards (auth.guard.ts)
├── models/           # TypeScript interfaces for data models
├── pages/           # Feature pages organized by functionality
│   ├── auth/        # Login/register pages
│   ├── onboarding/  # User setup flow
│   ├── chat-room/   # Individual chat room
│   └── video-call/  # Video consultation page
├── services/        # Business logic and API services
├── components/      # Reusable UI components (modals, charts)
└── tabs/           # Main app navigation structure
    ├── dashboard/   # Home dashboard
    ├── growth/      # Baby growth tracking
    ├── knowledge/   # Articles and educational content
    ├── chat/        # Community chat listing
    └── profile/     # User profile and settings
├── pages/
│   ├── personal-info/   # Personal information edit page
```

### Key Services Architecture
- **Backend Services**: Separate services per API resource (`backend-*.service.ts`), all calling the REST API through `ApiService`
- **Frontend Services**: UI-focused services that use backend services (`*.service.ts`)
- **Authentication**: `BackendAuthService` handles API-based auth with 2FA support. Google sign-in gets a Firebase ID token from the popup and posts it to `POST /api/auth/social` (`provider: "google"`); the API verifies it and logs the user in
- **API Service**: Comprehensive REST API client with JWT token management
- **Encryption**: Uses `EncryptionService` for sensitive data (OpenAI keys)

### Component Patterns
- **Modals**: Extensive use of modal components for forms and data entry
- **Page/Component Suffix**: Components must end with "Page" or "Component" (ESLint rule)
- **Prefix**: All components use "app" prefix with kebab-case selectors

### Firebase Configuration
- Firebase project: `naricare-app`
- Web config and VAPID key live in `src/environments/environment*.ts` and `src/firebase-messaging-sw.js`
- Firebase is used only for Google sign-in and FCM web push. No Firestore, no Firebase Hosting
- Facebook sign-in is hidden (commented out) on the login and register screens

### Mobile Features
- **Capacitor Integration**: Ready for iOS/Android builds
- **PWA Support**: Service worker configured for offline access
- **Push Notifications**: FCM web push (VAPID key configured); tokens are sent to the API, which sends pushes
- **Native APIs**: Local storage and device feature access

## Development Notes

### Authentication Flow
- **Backend Integration**: Uses `BackendAuthService` for API-based authentication
- **2FA Support**: Supports two-factor authentication via email OTP
- **Token Management**: JWT tokens stored in localStorage with automatic refresh
- **Auto-Redirect**: Automatically redirects to dashboard if user is already logged in on app refresh
- **Persistent Sessions**: Maintains login state across browser/app refreshes
- **Secure Logout**: Complete data cleanup on sign out (localStorage + Ionic Storage)
- **Sign Out Button**: Available in profile page with confirmation dialog
- Users go through onboarding after registration
- Tier-based access control (Basic, 1-Month, 3-Month programs)
- Auth guard protects authenticated routes using backend auth service

### Data Models
Key models include:
- `User` with tier information and baby details
- `Chat` for real-time messaging
- `GrowthTracking` for baby measurements
- `Consultation` for expert appointments
- `KnowledgeBase` for articles and categories

### Testing
- Karma/Jasmine setup for unit tests
- ESLint with Angular-specific rules
- Component and service testing patterns

### Firebase Setup
- See `FIREBASE_SETUP.md` for what Firebase is used for and how the `naricare-app` project is configured
- Environment files already hold the `naricare-app` web config and VAPID key; no setup needed for local runs

## Environments and deploy

The app is hosted on Netlify and auto-builds on merge.

| Env | Netlify site | URL | Branch | Build |
|---|---|---|---|---|
| Beta | `naricare-app` | https://beta-app.naricare.com | `staging` | `npm run build:beta` (`ng build --configuration beta`) |
| Prod | `naricare-prod` | https://app.naricare.com | `master` | production config (`npm run build:prod`) |

- Flow: feature branch from `staging`, PR into `staging` (Beta), then PR `staging` into `master` (Prod).
- Build output goes to `dist/`.
- Manual fallback after building: `npx -p netlify-cli netlify deploy --prod --no-build --dir dist --site <site>`.
- APIs: Beta https://beta-api.naricare.com, Prod https://api.naricare.com.