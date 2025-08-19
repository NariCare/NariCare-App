# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Authentication**: Firebase Auth
- **Database**: Firestore with real-time updates
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
```

### Key Services Architecture
- **Backend Services**: Separate services for each Firebase collection (`backend-*.service.ts`)
- **Frontend Services**: UI-focused services that use backend services (`*.service.ts`)
- **Encryption**: Uses `EncryptionService` for sensitive data (OpenAI keys)
- **API Integration**: Dual architecture supporting both Firebase and REST API backends

### Component Patterns
- **Modals**: Extensive use of modal components for forms and data entry
- **Page/Component Suffix**: Components must end with "Page" or "Component" (ESLint rule)
- **Prefix**: All components use "app" prefix with kebab-case selectors

### Firebase Configuration
- Environment files contain Firebase config
- Firestore security rules implemented for user data isolation
- Real-time subscriptions for chat and growth tracking data
- Firebase hosting ready

### Mobile Features
- **Capacitor Integration**: Ready for iOS/Android builds
- **PWA Support**: Service worker configured for offline access
- **Push Notifications**: Firebase Cloud Messaging setup
- **Native APIs**: Local storage and device feature access

## Development Notes

### Authentication Flow
- Users go through onboarding after registration
- Tier-based access control (Basic, 1-Month, 3-Month programs)
- Auth guard protects authenticated routes

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

### Firebase Setup Required
- See `FIREBASE_SETUP.md` for detailed Firebase configuration
- Environment variables need actual Firebase project credentials
- Firestore security rules provided for production use