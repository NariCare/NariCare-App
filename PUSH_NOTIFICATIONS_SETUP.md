# Complete Push Notifications Setup Guide

This guide covers setting up push notifications for **Web**, **Android**, and **iOS** platforms.

## 📋 Prerequisites

1. Firebase project with Cloud Messaging enabled
2. VAPID key generated for web push notifications
3. Android/iOS projects generated (if targeting mobile)

## 🌐 Web Setup (Already Complete)

✅ **Service Worker**: `src/firebase-messaging-sw.js`
✅ **Angular Config**: Updated `angular.json` to include service worker
✅ **Push Service**: `src/app/services/push-notification.service.ts`

### Generate VAPID Key (Required for Web):
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. In "Web configuration" section, click "Generate key pair"
3. Copy the key and update `push-notification.service.ts`:
```typescript
const token = await getToken(this.messaging, {
  vapidKey: 'YOUR_VAPID_KEY_HERE' // Replace with your actual VAPID key
});
```

## 📱 Android Setup

### 1. Add Android Platform:
```bash
ionic capacitor add android
ionic capacitor sync android
```

### 2. Firebase Configuration:
- Go to Firebase Console → Add Android App
- Enter package name (e.g., `io.ionic.starter`)
- Download `google-services.json`
- Place in: `android/app/google-services.json`

### 3. Update Gradle Files:

**android/build.gradle** (project level):
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

**android/app/build.gradle**:
```gradle
plugins {
    id 'com.google.gms.google-services'
}

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.2.1'
    implementation 'androidx.work:work-runtime:2.8.1'
}
```

### 4. Update AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application>
    <service
        android:name=".FirebaseMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
    
    <meta-data
        android:name="com.google.firebase.messaging.default_notification_channel_id"
        android:value="naricare_notifications" />
</application>
```

### 5. Create FirebaseMessagingService.java:
See `android-setup.md` for complete Java code.

## 🍎 iOS Setup

### 1. Add iOS Platform:
```bash
ionic capacitor add ios
ionic capacitor sync ios
```

### 2. Firebase Configuration:
- Go to Firebase Console → Add iOS App
- Enter bundle ID
- Download `GoogleService-Info.plist`
- Add to Xcode project

### 3. Configure Xcode:
- Add capabilities: Push Notifications, Background Modes
- Add Firebase SDK dependencies
- Update AppDelegate.swift (see `ios-setup.md`)

### 4. APNs Configuration:
- Create APNs certificate/key in Apple Developer Console
- Upload to Firebase Console

## 🔧 Backend API Integration

You'll need to create API endpoints to:

### 1. Store FCM Tokens:
```typescript
POST /api/push-tokens
{
  "userId": "user-id",
  "token": "fcm-token",
  "platform": "web|ios|android"
}
```

### 2. Send Push Notifications:
```typescript
POST /api/send-notification
{
  "userIds": ["user-id-1", "user-id-2"],
  "title": "Consultation Reminder",
  "body": "Your consultation starts in 10 minutes",
  "data": {
    "type": "consultation",
    "consultationId": "consultation-id"
  }
}
```

## 🧪 Testing

### Web Testing:
1. Restart dev server: `ionic serve`
2. Open browser dev tools → Application → Service Workers
3. Check for successful FCM registration
4. Test with Firebase Console → Cloud Messaging → Send test message

### Android Testing:
```bash
ionic capacitor run android
```
- Test on physical device (emulator has limitations)
- Check Logcat for FCM token registration
- Send test notification from Firebase Console

### iOS Testing:
```bash
ionic capacitor run ios
```
- Must test on physical device
- Check Xcode console for FCM token
- Ensure proper APNs certificate setup

## 🚀 Production Considerations

1. **Environment Variables**: Store sensitive keys in environment files
2. **Token Management**: Implement token refresh logic
3. **Notification Categories**: Set up rich notifications with actions
4. **Analytics**: Track notification delivery and engagement
5. **Targeting**: Implement user segmentation for targeted notifications

## 📂 File Structure

```
src/
├── firebase-messaging-sw.js                    # Web service worker
├── app/services/push-notification.service.ts   # Universal push service
android/
├── app/google-services.json                    # Firebase config
├── app/src/main/AndroidManifest.xml           # Permissions & services
└── app/src/main/java/.../FirebaseMessagingService.java
ios/
├── App/GoogleService-Info.plist               # Firebase config
└── App/App/AppDelegate.swift                  # Push notification setup
```

## 🔍 Troubleshooting

- **Web**: Check service worker registration in dev tools
- **Android**: Verify `google-services.json` placement and gradle sync
- **iOS**: Ensure proper bundle ID matching and certificate setup
- **All Platforms**: Check Firebase project configuration and API keys

## 📝 Next Steps

1. Generate VAPID key and update web configuration
2. Set up Android/iOS projects if targeting mobile
3. Implement backend API for token management
4. Test on all target platforms
5. Configure notification categories and rich notifications