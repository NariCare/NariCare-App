# Firebase Setup Guide for NariCare App

Firebase is already configured. This page explains what it is used for and where the settings live, so you know what to keep enabled.

## What Firebase is used for

NariCare uses Firebase for exactly two things:

1. **Google sign-in (web).** The app opens the Google popup, gets a Firebase ID token and posts it to `POST /api/auth/social` with `provider: "google"`. The API verifies the token and logs the user in (creating or linking the MySQL user).
2. **Firebase Cloud Messaging (web push).** The app registers an FCM token and sends it to the API, which sends pushes.

Firebase is **not** the database. All app data and email/password login go through the NariCare REST API (Node/Express, MySQL). Firestore and Firebase Hosting are not used.

## Project

- Project ID: `naricare-app` (project number 382548282570)
- Auth domain: `naricare-app.firebaseapp.com`
- Web app ID: `1:382548282570:web:3d735a09a72507813ef833`

## Where the config lives

| File | Contains |
|---|---|
| `src/environments/environment.ts` | Web config + VAPID key (local) |
| `src/environments/environment.beta.ts` | Web config + VAPID key (Beta) |
| `src/environments/environment.prod.ts` | Web config + VAPID key (Prod) |
| `src/firebase-messaging-sw.js` | Web config for the push service worker |

If the web config ever changes, update all four files together.

## Console settings to keep

**Authentication > Sign-in method**
- Google: enabled (required).
- Email/Password also shows enabled, but the app does not use Firebase for email/password login.
- Facebook: not used. The Facebook buttons are hidden on the login and register screens.

**Authentication > Settings > Authorized domains**
- `localhost`
- `naricare-app.firebaseapp.com`
- `naricare-app.web.app`
- `beta-app.naricare.com`
- `app.naricare.com`

Add a domain here before serving the app from a new host, or Google sign-in fails on it.

**Cloud Messaging**
- The Web Push certificate (VAPID key) is already generated and set as `vapidKey` in the environment files.

## Browser API key restriction

The browser API key is restricted by HTTP referrer to:

- `beta-app.naricare.com`
- `app.naricare.com`
- `naricare-app.firebaseapp.com`
- `localhost:8100`
- `localhost:4200`

If you run the app on another host or port, add it to the key restriction in Google Cloud Console > APIs & Services > Credentials.

## Server side (NariCare-Service)

- The API uses the service account `naricare-server@naricare-app.iam.gserviceaccount.com` (Firebase Auth admin and FCM admin roles) through firebase-admin.
- Its JSON key is read from the env var `FIREBASE_SERVICE_ACCOUNT` (minified, one line). Never commit it.

## Mobile apps (later)

For native iOS/Android builds you will need to add the apps to the `naricare-app` project and download `GoogleService-Info.plist` / `google-services.json`. See `PUSH_NOTIFICATIONS_SETUP.md`.
